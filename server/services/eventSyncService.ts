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

      // Process each guest wrapper in this batch
      for (const guestWrapper of (data.guests || [])) {
        const guest = guestWrapper.guest;

        if (guest.approval_status === 'approved') {
          // Enhanced logging for check-in data
          console.log('Processing guest check-in data:', {
            guestId: guest.api_id,
            email: guest.email,
            name: guest.name,
            status: guest.approval_status,
            registeredAt: guest.registered_at,
            checkedInAt: guest.checked_in_at, // Log the check-in time specifically
            eventTicketCheckedInAt: guest.event_ticket?.checked_in_at, // Also log ticket check-in time
          });

          // Determine the actual check-in time (either from guest or ticket)
          const checkedInAt = guest.checked_in_at || guest.event_ticket?.checked_in_at || null;

          // Store attendance with check-in data
          const storedAttendance = await storage.upsertAttendance({
            guestApiId: guest.api_id,
            eventApiId: event.api_id,
            userEmail: guest.email.toLowerCase(),
            registeredAt: guest.registered_at,
            checkedInAt: checkedInAt, // Make sure we're passing the check-in time
            approvalStatus: guest.approval_status,
          });

          // Verify storage after upsert
          console.log('Stored attendance record:', {
            guestId: guest.api_id,
            storedCheckedInAt: storedAttendance.checkedInAt,
            originalCheckedInAt: checkedInAt
          });

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

    // Log final check-in statistics
    const checkedInCount = allGuests.filter(guest => guest.checked_in_at || guest.event_ticket?.checked_in_at).length;
    console.log('Check-in statistics:', {
      totalGuests: allGuests.length,
      checkedInGuests: checkedInCount,
      eventId: event.api_id
    });

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