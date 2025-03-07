import { storage } from '../storage';
import type { Event } from '@shared/schema';

async function syncEventAttendees(event: Event) {
  console.log(`Starting background sync for event: ${event.title} (${event.api_id})`);

  try {
    // Clear existing attendance records for this event
    await storage.deleteAttendanceByEvent(event.api_id);

    let hasMore = true;
    let cursor: string | undefined;
    let page = 1;
    const allGuests: any[] = [];

    while (hasMore && page <= 10) {
      const params = new URLSearchParams({
        event_api_id: event.api_id,
        ...(cursor ? { pagination_cursor: cursor } : {})
      });

      const response = await fetch(
        `https://api.lu.ma/public/v1/event/get-guests?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.LUMA_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch guests');
      }

      const data = await response.json();
      // Filter for approved guests only
      const approvedGuests = (data.guests || []).filter((guest: any) => guest.approval_status === 'approved');
      allGuests.push(...approvedGuests);

      hasMore = data.has_more;
      cursor = data.pagination_cursor;
      page++;
    }

    // Process and store approved guests
    const syncTimestamp = new Date().toISOString();
    for (const guest of allGuests) {
      await storage.upsertAttendance({
        guestApiId: guest.api_id,
        eventApiId: event.api_id,
        userEmail: guest.email.toLowerCase(),
        registeredAt: guest.registered_at,
        approvalStatus: guest.approval_status
      });
    }

    // Update event sync timestamp
    await storage.updateEventSyncStatus(event.api_id, {
      lastSyncedAt: syncTimestamp,
      attendanceCount: allGuests.length
    });

    console.log(`Successfully synced ${allGuests.length} approved guests for event: ${event.title}`);
  } catch (error) {
    console.error(`Failed to sync event ${event.api_id}:`, error);
    throw error; // Re-throw to handle in the caller
  }
}

async function syncFutureEvents() {
  try {
    const futureEvents = await storage.getFutureEvents();
    console.log(`Found ${futureEvents.length} future events to sync`);

    for (const event of futureEvents) {
      try {
        await syncEventAttendees(event);
      } catch (error) {
        console.error(`Failed to sync future event ${event.api_id}:`, error);
        // Continue with next event even if one fails
      }
    }
  } catch (error) {
    console.error('Error in future events sync:', error);
  }
}

export function startEventSyncService() {
  // Run every 5 minutes for recently ended events
  const RECENT_SYNC_INTERVAL = 5 * 60 * 1000;

  // Run every 6 hours for future events
  const FUTURE_SYNC_INTERVAL = 6 * 60 * 60 * 1000;

  // Sync recently ended events
  setInterval(async () => {
    try {
      const recentlyEndedEvents = await storage.getRecentlyEndedEvents();
      console.log(`Found ${recentlyEndedEvents.length} recently ended events to sync`);

      for (const event of recentlyEndedEvents) {
        try {
          await syncEventAttendees(event);
        } catch (error) {
          console.error(`Failed to sync event ${event.api_id}:`, error);
          // Continue with next event even if one fails
        }
      }
    } catch (error) {
      console.error('Error in event sync service:', error);
    }
  }, RECENT_SYNC_INTERVAL);

  // Sync future events every 6 hours
  setInterval(async () => {
    console.log('Starting scheduled sync of future events...');
    await syncFutureEvents();
  }, FUTURE_SYNC_INTERVAL);

  // Initial sync of future events when service starts
  syncFutureEvents().catch(error => {
    console.error('Failed initial sync of future events:', error);
  });

  console.log('Event sync service started with both recent and future event syncing');
}