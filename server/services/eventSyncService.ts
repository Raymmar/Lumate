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

      // Log raw API response for debugging
      console.log('Raw API Response:', {
        totalGuests: data.guests?.length,
        firstGuest: data.guests?.[0]?.guest ? {
          guestId: data.guests[0].guest.api_id,
          email: data.guests[0].guest.email,
          checkedInAt: data.guests[0].guest.checked_in_at,
          eventTicket: data.guests[0].guest.event_ticket,
          hasTicketCheckIn: data.guests[0].guest.event_ticket?.checked_in_at !== null
        } : null,
        hasMore: data.has_more
      });

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
            guestCheckedInAt: guest.checked_in_at, // Direct check-in time
            ticketCheckedInAt: guest.event_ticket?.checked_in_at, // Ticket check-in time
          });

          // Determine the actual check-in time by checking both sources
          let checkedInAt = null;
          const guestCheckIn = guest.checked_in_at;
          const ticketCheckIn = guest.event_ticket?.checked_in_at;

          // Convert valid timestamps to ISO string format
          if (guestCheckIn) {
            checkedInAt = new Date(guestCheckIn).toISOString();
          } else if (ticketCheckIn) {
            checkedInAt = new Date(ticketCheckIn).toISOString();
          }

          if (checkedInAt) {
            console.log(`Found and formatted check-in time for guest ${guest.email}:`, {
              originalGuestCheckIn: guestCheckIn,
              originalTicketCheckIn: ticketCheckIn,
              formattedCheckInTime: checkedInAt
            });
          }

          // Store attendance with check-in data
          const storedAttendance = await storage.upsertAttendance({
            guestApiId: guest.api_id,
            eventApiId: event.api_id,
            userEmail: guest.email.toLowerCase(),
            registeredAt: new Date(guest.registered_at).toISOString(),
            checkedInAt,
            approvalStatus: guest.approval_status,
          });

          // Verify storage after upsert
          console.log('Stored attendance record:', {
            guestId: guest.api_id,
            email: guest.email,
            storedCheckedInAt: storedAttendance.checkedInAt,
            originalCheckedInAt: checkedInAt,
            storedSuccessfully: storedAttendance.checkedInAt === checkedInAt
          });

          allGuests.push(guest);
        }
      }

      hasMore = data.has_more;
      cursor = data.next_cursor;
      page++;

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update event sync timestamp
    await storage.updateEventAttendanceSync(event.api_id);

    // Log final statistics
    const checkedInCount = allGuests.filter(guest => 
      guest.checked_in_at || (guest.event_ticket && guest.event_ticket.checked_in_at)
    ).length;

    console.log('Sync completed - Check-in statistics:', {
      eventId: event.api_id,
      eventTitle: event.title,
      totalGuests: allGuests.length,
      checkedInGuests: checkedInCount,
      checkInPercentage: allGuests.length ? (checkedInCount / allGuests.length * 100).toFixed(1) + '%' : '0%'
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