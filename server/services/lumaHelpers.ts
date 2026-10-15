import { Response } from "express";
import { storage } from "../storage";

const LUMA_API_BASE = "https://api.lu.ma/public/v1";

export function initSSE(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  
  const app = res.app;
  const connections = app.get('activeSSEConnections') || [];
  connections.push(res);
  app.set('activeSSEConnections', connections);
  
  res.on('close', () => {
    console.log('SSE connection closed');
    const currentConnections = app.get('activeSSEConnections') || [];
    const index = currentConnections.indexOf(res);
    if (index !== -1) {
      currentConnections.splice(index, 1);
      app.set('activeSSEConnections', currentConnections);
      console.log(`SSE connection removed, ${currentConnections.length} connections remaining`);
    }
  });
}

export function sendSSEUpdate(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function lumaApiRequest(
  endpoint: string,
  params?: Record<string, string>,
  options: { method?: string; body?: string } = {},
) {
  const url = new URL(`${LUMA_API_BASE}/${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  if (!process.env.LUMA_API_KEY) {
    throw new Error("LUMA_API_KEY environment variable is not set");
  }

  console.log(`Making ${options.method || "GET"} request to Luma API:`, {
    endpoint,
    params,
    method: options.method || "GET",
    hasBody: !!options.body,
  });

  const maxRetries = 3;
  let retryCount = 0;
  let retryDelay = 1000;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-luma-api-key": process.env.LUMA_API_KEY,
        },
        ...(options.body ? { body: options.body } : {}),
      });

      if (response.status === 429) {
        retryCount++;
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;

        console.log(
          `Rate limited, waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`,
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retryDelay *= 2;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Luma API error for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          params,
        });
        const err: any = new Error(
          `Luma API error: ${response.statusText} - ${errorText}`,
        );
        err.statusCode = response.status;
        err.nonRetryable = response.status === 400;
        throw err;
      }

      const data = await response.json();

      console.log(`Luma API response for ${endpoint}:`, {
        status: response.status,
        hasData: !!data,
        hasEntries: data?.entries?.length > 0,
        entriesCount: data?.entries?.length,
        hasMore: data?.has_more,
        nextCursor: data?.next_cursor,
      });

      return data;
    } catch (error: any) {
      if (error?.nonRetryable) {
        console.error(`Luma API request failed for ${endpoint} (non-retryable):`, error);
        throw error;
      }
      if (retryCount === maxRetries - 1) {
        console.error(
          `Luma API request failed for ${endpoint} after ${maxRetries} retries:`,
          error,
        );
        throw error;
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retryDelay *= 2;
    }
  }
}

export interface NormalizedGuest {
  email: string;
  guestApiId: string;
  approvalStatus: string;
  registeredAt: string;
  ticketTypeId: string | null;
  ticketTypeName: string | null;
  ticketAmount: number;
  displayName: string | null;
}

export function normalizeLumaGuest(entry: any): NormalizedGuest {
  const guest = entry.guest || entry;
  return {
    email: (guest.email || '').toLowerCase(),
    guestApiId: guest.api_id || guest.guest_id,
    approvalStatus: guest.approval_status,
    registeredAt: guest.registered_at,
    ticketTypeId: guest.event_ticket?.event_ticket_type_id || null,
    ticketTypeName: guest.event_ticket?.name || null,
    ticketAmount: guest.event_ticket?.amount || 0,
    displayName: guest.name || guest.user_name || null,
  };
}

export async function fetchAllEventGuests(eventApiId: string): Promise<NormalizedGuest[]> {
  const allGuests: NormalizedGuest[] = [];
  let cursor: string | undefined;
  let page = 1;

  do {
    const params: Record<string, string> = { event_api_id: eventApiId };
    if (cursor) {
      params.pagination_cursor = cursor;
    }

    const response = await lumaApiRequest("event/get-guests", params);

    if (response?.entries) {
      for (const entry of response.entries) {
        const normalized = normalizeLumaGuest(entry);
        if (normalized.approvalStatus === "approved") {
          allGuests.push(normalized);
        }
      }
      cursor = response.next_cursor;
    } else {
      cursor = undefined;
    }

    console.log(`Fetched page ${page} of guests for ${eventApiId}: ${allGuests.length} approved so far, hasMore: ${!!cursor}`);
    page++;
  } while (cursor);

  return allGuests;
}

export type ProgressCallback = (info: {
  type: 'status' | 'progress' | 'error' | 'complete';
  message: string;
  progress: number;
  data?: any;
}) => void;

export async function syncEventAttendees(
  eventApiId: string,
  options: {
    clearExisting?: boolean;
    onProgress?: ProgressCallback;
  } = {}
): Promise<{ totalProcessed: number; successCount: number; failureCount: number }> {
  const { clearExisting = true, onProgress } = options;

  if (clearExisting) {
    onProgress?.({ type: 'status', message: 'Clearing existing attendance records...', progress: 5 });
    await storage.deleteAttendanceByEvent(eventApiId);
    onProgress?.({ type: 'status', message: 'Successfully cleared existing attendance records', progress: 10 });
  }

  onProgress?.({ type: 'status', message: 'Fetching guest list from event platform...', progress: 15 });

  const guests = await fetchAllEventGuests(eventApiId);
  
  let totalProcessed = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const guest of guests) {
    totalProcessed++;
    try {
      await storage.upsertAttendance({
        eventApiId,
        userEmail: guest.email,
        guestApiId: guest.guestApiId,
        approvalStatus: guest.approvalStatus,
        registeredAt: guest.registeredAt,
        ticketTypeId: guest.ticketTypeId,
        ticketTypeName: guest.ticketTypeName,
        ticketAmount: guest.ticketAmount,
      });
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`Failed to upsert attendance for ${guest.email}:`, error);
    }

    const progress = Math.min(90, 15 + (totalProcessed / guests.length) * 75);
    onProgress?.({
      type: 'progress',
      message: `Processing guest ${totalProcessed}/${guests.length}: ${guest.email}`,
      progress,
      data: {
        processedGuests: totalProcessed,
        totalGuests: guests.length,
        currentEmail: guest.email,
        success: successCount,
        failure: failureCount,
      },
    });
  }

  await storage.updateEventAttendanceSync(eventApiId);

  onProgress?.({
    type: 'complete',
    message: `Attendance sync completed: ${successCount} synced, ${failureCount} failed`,
    progress: 100,
    data: { totalProcessed, successCount, failureCount },
  });

  return { totalProcessed, successCount, failureCount };
}
