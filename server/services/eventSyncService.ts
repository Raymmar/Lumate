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

      console.log('Processing approved guest:', {
        guestId: guest.api_id,
        email: guest.email,
        status: guest.approval_status,
        registeredAt: guest.registered_at,
        checkedInAt: guest.checked_in_at // Log check-in time from API
      });

      // Process and store approved guests
      for (const guest of allGuests) {
        await storage.upsertAttendance({
          guestApiId: guest.api_id,
          eventApiId: event.api_id,
          userEmail: guest.email.toLowerCase(),
          registeredAt: guest.registered_at,
          checkedInAt: guest.checked_in_at, // Pass check-in time to storage
          approvalStatus: guest.approval_status,
        });
      }

      hasMore = data.has_more;
      cursor = data.pagination_cursor;
      page++;

      console.log('Pagination status:', {
        iteration: page,
        guestsCollected: allGuests.length,
        hasMore,
        cursor
      });
    }

    // Update event sync timestamp
    await storage.updateEventAttendanceSync(event.api_id);
    console.log(`Successfully synced ${allGuests.length} approved guests for event: ${event.title}`);
  } catch (error) {
    console.error(`Failed to sync event ${event.api_id}:`, error);
  }
}

export function startEventSyncService() {
  // Run every 5 minutes
  const SYNC_INTERVAL = 5 * 60 * 1000;

  setInterval(async () => {
    try {
      const recentlyEndedEvents = await storage.getRecentlyEndedEvents();

      console.log(`Found ${recentlyEndedEvents.length} recently ended events to sync`);

      for (const event of recentlyEndedEvents) {
        await syncEventAttendees(event);
      }
    } catch (error) {
      console.error('Error in event sync service:', error);
    }
  }, SYNC_INTERVAL);

  console.log('Event sync service started');
}