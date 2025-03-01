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
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-luma-api-key': process.env.LUMA_API_KEY || ''
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch guests');
      }

      const data = await response.json();

      // Log the raw API response to inspect the data structure
      console.log('Raw API Response for first guest:', {
        firstGuest: data.guests?.[0],
        totalGuests: data.guests?.length,
        hasMore: data.has_more,
        nextCursor: data.next_cursor
      });

      // Process each guest wrapper in this batch
      for (const guestWrapper of (data.guests || [])) {
        const guest = guestWrapper.guest;

        if (guest.approval_status === 'approved') {
          // Add detailed logging for check-in data
          console.log('Guest data from API:', {
            guestId: guest.api_id,
            email: guest.email,
            status: guest.approval_status,
            registeredAt: guest.registered_at,
            checkedInAt: guest.checked_in_at,
            rawGuestData: guest // Log the complete guest object for debugging
          });

          await storage.upsertAttendance({
            guestApiId: guest.api_id,
            eventApiId: event.api_id,
            userEmail: guest.email.toLowerCase(),
            registeredAt: guest.registered_at,
            checkedInAt: guest.checked_in_at,
            approvalStatus: guest.approval_status,
          });

          // Verify storage after upsert
          const storedAttendance = await storage.getAttendanceByGuestId(guest.api_id);
          console.log('Stored attendance record:', storedAttendance);

          allGuests.push(guest);
        }
      }

      console.log('Pagination status:', {
        iteration: page,
        guestsCollected: allGuests.length,
        hasMore: data.has_more,
        cursor: data.next_cursor
      });

      hasMore = data.has_more;
      cursor = data.next_cursor;
      page++;
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