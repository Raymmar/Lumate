import { storage } from '../storage';
import type { Event } from '@shared/schema';

async function syncEventAttendees(event: Event) {
  console.log(`Starting background sync for event: ${event.title} (${event.api_id})`);
  console.log(`Event details: Start: ${event.startTime}, End: ${event.endTime}, Last sync: ${event.lastAttendanceSync || 'never'}`);

  try {
    // Check initial sync status
    const initialStatus = await storage.getEventAttendanceStatus(event.api_id);
    console.log('Initial sync status:', {
      eventId: event.api_id,
      hasAttendees: initialStatus.hasAttendees,
      lastSyncTime: initialStatus.lastSyncTime
    });

    // Clear existing attendance records for this event
    await storage.deleteAttendanceByEvent(event.api_id);

    let hasMore = true;
    let cursor: string | undefined;
    let page = 1;
    const allGuests: any[] = [];

    while (hasMore && page <= 10) {
      console.log(`Fetching guests page ${page} for event ${event.api_id}`);
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

      console.log(`Pagination status:`, {
        iteration: page,
        guestsCollected: allGuests.length,
        hasMore,
        cursor
      });
    }

    // Process and store approved guests
    for (const guest of allGuests) {
      console.log('Processing approved guest:', {
        guestId: guest.api_id,
        email: guest.email,
        status: guest.approval_status,
        registeredAt: guest.registered_at
      });

      await storage.upsertAttendance({
        guestApiId: guest.api_id,
        eventApiId: event.api_id,
        userEmail: guest.email.toLowerCase(),
        registeredAt: guest.registered_at,
        approvalStatus: guest.approval_status,
      });

      console.log('Successfully stored attendance for guest:', guest.api_id);
    }

    // Update event sync timestamp
    await storage.updateEventAttendanceSync(event.api_id);

    // Check final sync status
    const finalStatus = await storage.getEventAttendanceStatus(event.api_id);
    console.log('Final sync status:', {
      eventId: event.api_id,
      hasAttendees: finalStatus.hasAttendees,
      lastSyncTime: finalStatus.lastSyncTime,
      totalGuestsProcessed: allGuests.length
    });

    console.log(`Successfully synced ${allGuests.length} approved guests for event: ${event.title}`);
  } catch (error) {
    console.error(`Failed to sync event ${event.api_id}:`, error);
  }
}

async function checkAndSyncEvents() {
  try {
    // Get both recently ended events and old unsynced events
    const [recentlyEndedEvents, oldUnsynedEvents] = await Promise.all([
      storage.getRecentlyEndedEvents(),
      storage.getOldUnsyncedEvents()
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
}

export function startEventSyncService() {
  // Run every 5 minutes
  const SYNC_INTERVAL = 5 * 60 * 1000;

  // Run an initial sync when the service starts
  console.log('Running initial event sync on service start...');
  checkAndSyncEvents();

  // Set up periodic sync
  setInterval(checkAndSyncEvents, SYNC_INTERVAL);

  console.log('Event sync service started with automatic old event syncing');
}