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
    for (const guest of allGuests) {
      await storage.upsertAttendance({
        guestApiId: guest.api_id,
        eventApiId: event.api_id,
        userEmail: guest.email.toLowerCase(),
        registeredAt: guest.registered_at,
        approvalStatus: guest.approval_status,
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
      // Get both recently ended events and old unsynced events
      const [recentlyEndedEvents, oldUnsynedEvents] = await Promise.all([
        storage.getRecentlyEndedEvents(),
        storage.getOldUnsyncedEvents() // New function to get events that ended >24h ago and haven't been synced
      ]);

      const eventsToSync = [...recentlyEndedEvents, ...oldUnsynedEvents];
      const uniqueEvents = eventsToSync.filter((event, index, self) => 
        index === self.findIndex((e) => e.api_id === event.api_id)
      );

      console.log(`Found ${recentlyEndedEvents.length} recently ended events and ${oldUnsynedEvents.length} old unsynced events to sync`);

      for (const event of uniqueEvents) {
        await syncEventAttendees(event);
      }
    } catch (error) {
      console.error('Error in event sync service:', error);
    }
  }, SYNC_INTERVAL);

  console.log('Event sync service started with automatic old event syncing');
}