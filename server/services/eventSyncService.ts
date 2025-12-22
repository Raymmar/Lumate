import { storage, setMemberStatsSyncing } from "../storage";
import type { Event } from "@shared/schema";
import { db } from "../db";
import { users, events } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hasActivePremium } from "../utils/premiumCheck";
import { syncCouponsForEvent } from "./couponSyncService";

async function syncEventAttendees(event: Event) {
  console.log(
    `Starting background sync for event: ${event.title} (${event.api_id})`,
  );

  try {
    // Get the event's premium settings
    const eventData = await db
      .select()
      .from(events)
      .where(eq(events.api_id, event.api_id))
      .limit(1);

    const grantsPremiumAccess = eventData[0]?.grantsPremiumAccess || false;
    const premiumTicketTypes = eventData[0]?.premiumTicketTypes || [];
    const premiumExpiresAt = eventData[0]?.premiumExpiresAt;

    // Clear existing attendance records for this event
    await storage.deleteAttendanceByEvent(event.api_id);

    let hasMore = true;
    let cursor: string | undefined;
    let page = 1;
    const allGuests: any[] = [];

    while (hasMore) {
      const params = new URLSearchParams({
        event_api_id: event.api_id,
        ...(cursor ? { pagination_cursor: cursor } : {}),
      });

      const response = await fetch(
        `https://api.lu.ma/public/v1/event/get-guests?${params}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LUMA_API_KEY}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch guests");
      }

      const data = await response.json();

      // Filter for approved guests only
      const approvedGuests = (data.entries || []).filter(
        (entry: any) => entry.guest.approval_status === "approved",
      );

      allGuests.push(...approvedGuests);

      hasMore = data.has_more;
      cursor = data.next_cursor;
      console.log(
        `Background Fetched page ${page} of guests hasMore:${hasMore} cursor:${cursor}`,
      );

      page++;
    }

    // Process and store approved guests with ticket information
    let premiumGrantedCount = 0;
    
    for (const entry of allGuests) {
      const { guest } = entry;
      
      // Extract ticket information
      const ticketTypeId = guest.event_ticket?.event_ticket_type_id || null;
      const ticketTypeName = guest.event_ticket?.name || null;
      const ticketAmount = guest.event_ticket?.amount || 0;
      
      // Store attendance with ticket data
      await storage.upsertAttendance({
        guestApiId: guest.api_id,
        eventApiId: event.api_id,
        userEmail: guest.email.toLowerCase(),
        registeredAt: guest.registered_at,
        approvalStatus: guest.approval_status,
        ticketTypeId: ticketTypeId,
        ticketTypeName: ticketTypeName,
        ticketAmount: ticketAmount,
      });

      // Check if this attendee should get premium access
      if (grantsPremiumAccess && 
          ticketTypeId && 
          premiumTicketTypes.includes(ticketTypeId)) {
        
        // Find the user by email
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, guest.email.toLowerCase()))
          .limit(1);

        if (user.length > 0) {
          const currentUser = user[0];
          
          // Calculate expiration date if not set
          const calculatedExpiresAt = premiumExpiresAt || 
            new Date(`${new Date(event.startTime).getFullYear()}-12-31T23:59:59Z`).toISOString();
          
          // Check if user already has premium from any source
          const alreadyHasPremium = hasActivePremium(currentUser);
          const hasActiveStripePremium = currentUser.subscriptionStatus === 'active';
          
          if (!hasActiveStripePremium) {
            // Check if this would extend their current Luma premium
            const hasActiveLumaPremium = currentUser.premiumSource === 'luma' && 
              currentUser.premiumExpiresAt && 
              new Date(currentUser.premiumExpiresAt) > new Date();
            
            const shouldUpdate = !hasActiveLumaPremium || 
              (new Date(calculatedExpiresAt) > new Date(currentUser.premiumExpiresAt!));
            
            if (shouldUpdate) {
              await db
                .update(users)
                .set({
                  premiumSource: 'luma',
                  premiumExpiresAt: calculatedExpiresAt,
                  premiumGrantedAt: new Date().toISOString(),
                  lumaTicketId: ticketTypeId,
                })
                .where(eq(users.id, currentUser.id));
              
              premiumGrantedCount++;
              console.log(`Granted premium access to ${guest.email} through ${calculatedExpiresAt}`);
            }
          }
        }
      }
    }

    // Update event sync timestamp
    await storage.updateEventAttendanceSync(event.api_id);

    console.log(
      `Successfully synced ${allGuests.length} approved guests for event: ${event.title}` +
      (premiumGrantedCount > 0 ? `, granted premium to ${premiumGrantedCount} users` : ''),
    );

    // Sync coupons from Luma to get authoritative redemption status
    try {
      const couponResult = await syncCouponsForEvent(event.api_id);
      if (couponResult.synced > 0) {
        console.log(`[CouponSync] Synced ${couponResult.synced} coupons for ${event.title} (${couponResult.created} new, ${couponResult.updated} updated)`);
      }
    } catch (couponError) {
      console.error(`[CouponSync] Failed to sync coupons for ${event.title}:`, couponError);
    }
  } catch (error) {
    console.error(`Failed to sync event ${event.api_id}:`, error);
    throw error; // Re-throw to handle in the caller
  }
}

async function syncFutureEvents() {
  try {
    // Signal that sync is starting - member stats should use cached data
    setMemberStatsSyncing(true);
    
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
    console.error("Error in future events sync:", error);
  } finally {
    // Signal that sync is complete - member stats can refresh
    setMemberStatsSyncing(false);
  }
}

export async function startEventSyncService(immediate: boolean = false): Promise<{ recentSyncInterval: NodeJS.Timeout, futureSyncInterval: NodeJS.Timeout }> {
  // Run every hour for recently ended events
  const RECENT_SYNC_INTERVAL = 60 * 60 * 1000;

  // Run every 6 hours for future events
  const FUTURE_SYNC_INTERVAL = 6 * 60 * 60 * 1000;

  // Sync recently ended events
  const recentSyncInterval = setInterval(async () => {
    try {
      setMemberStatsSyncing(true);
      const recentlyEndedEvents = await storage.getRecentlyEndedEvents();
      console.log(
        `Found ${recentlyEndedEvents.length} recently ended events to sync`,
      );

      for (const event of recentlyEndedEvents) {
        try {
          await syncEventAttendees(event);
        } catch (error) {
          console.error(`Failed to sync event ${event.api_id}:`, error);
          // Continue with next event even if one fails
        }
      }
    } catch (error) {
      console.error("Error in event sync service:", error);
    } finally {
      setMemberStatsSyncing(false);
    }
  }, RECENT_SYNC_INTERVAL);

  // Sync future events every 6 hours
  const futureSyncInterval = setInterval(async () => {
    console.log("Starting scheduled sync of future events...");
    await syncFutureEvents();
  }, FUTURE_SYNC_INTERVAL);

  if (immediate) {
    console.log("Starting immediate sync of future events...");
    await syncFutureEvents();
  }

  // Initial sync of future events when service starts
  syncFutureEvents().catch((error) => {
    console.error("Failed initial sync of future events:", error);
  });

  console.log(
    "Event sync service started with both recent and future event syncing",
  );

  return { recentSyncInterval, futureSyncInterval };
}
