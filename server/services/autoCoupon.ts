import { storage } from "../storage";
import { db } from "../db";
import { events, coupons, people } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { lumaApiRequest } from "../routes";
import { sendCouponNotificationEmail } from "../email";

function generateCouponCode(eventPrefix: string, recipientId: number): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `${eventPrefix}-${recipientId}-${random}`;
  return code.substring(0, 20);
}

export class AutoCouponService {
  static async generateCouponsForNewSubscriber(userId: number, userEmail: string): Promise<{
    eventsProcessed: number;
    couponsCreated: number;
    errors: string[];
  }> {
    const results = {
      eventsProcessed: 0,
      couponsCreated: 0,
      errors: [] as string[],
    };

    try {
      console.log(`[AutoCoupon] Checking auto-coupon events for new subscriber: ${userEmail} (user ${userId})`);

      const activeAutoCouponEvents = await storage.getActiveAutoCouponEvents();

      if (activeAutoCouponEvents.length === 0) {
        console.log(`[AutoCoupon] No active auto-coupon events found`);
        return results;
      }

      console.log(`[AutoCoupon] Found ${activeAutoCouponEvents.length} active auto-coupon events`);

      const matchedPerson = await storage.getPersonByEmail(userEmail);
      const personId = matchedPerson?.id || null;

      for (const autoCouponEvent of activeAutoCouponEvents) {
        results.eventsProcessed++;

        try {
          const existingCoupons = await storage.getUnredeemedCouponsByEventAndEmail(
            autoCouponEvent.eventApiId,
            userEmail
          );

          if (existingCoupons.length > 0) {
            console.log(`[AutoCoupon] User ${userEmail} already has a coupon for event ${autoCouponEvent.eventApiId}, skipping`);
            continue;
          }

          const eventData = await db
            .select()
            .from(events)
            .where(eq(events.api_id, autoCouponEvent.eventApiId))
            .limit(1);

          if (!eventData[0]) {
            console.log(`[AutoCoupon] Event ${autoCouponEvent.eventApiId} not found in database, skipping`);
            continue;
          }

          const event = eventData[0];
          const eventPrefix = event.title
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 6)
            .toUpperCase();

          const couponCode = generateCouponCode(eventPrefix, userId);

          const discountType = autoCouponEvent.discountType || 'percent';
          const discountPercent = autoCouponEvent.discountPercent;
          const centsOff = autoCouponEvent.centsOff;

          const lumaPayload: any = {
            code: couponCode,
            event_api_id: autoCouponEvent.eventApiId,
            remaining_count: 1,
            discount: discountType === 'percent'
              ? { discount_type: "percent", percent_off: discountPercent }
              : { discount_type: "cents", cents_off: centsOff },
          };

          if (autoCouponEvent.ticketTypeId) {
            lumaPayload.discount.ticket_api_ids = [autoCouponEvent.ticketTypeId];
          }

          console.log(`[AutoCoupon] Creating Luma coupon for ${userEmail} for event ${autoCouponEvent.eventTitle}: ${couponCode}`);

          let lumaCouponApiId: string | null = null;
          try {
            const lumaResponse = await lumaApiRequest("event/create-coupon", undefined, {
              method: "POST",
              body: JSON.stringify(lumaPayload),
            });
            lumaCouponApiId = lumaResponse?.coupon?.api_id || null;
          } catch (lumaError) {
            console.error(`[AutoCoupon] Failed to create Luma coupon:`, lumaError);
          }

          const couponData = {
            eventApiId: autoCouponEvent.eventApiId,
            eventTitle: autoCouponEvent.eventTitle || event.title,
            eventUrl: autoCouponEvent.eventUrl || event.url || null,
            ticketTypeId: autoCouponEvent.ticketTypeId || null,
            ticketTypeName: autoCouponEvent.ticketTypeName || null,
            code: couponCode,
            lumaCouponApiId,
            recipientUserId: userId,
            recipientPersonId: personId,
            recipientEmail: userEmail,
            discountPercent: discountPercent,
            centsOff: centsOff,
            discountType: discountType,
            couponType: 'targeted' as const,
            maxUses: 1,
            remainingCount: 1,
            validStartAt: null,
            validEndAt: null,
            status: 'issued',
            issuedByUserId: null,
          };

          await storage.createCoupon(couponData);
          results.couponsCreated++;

          console.log(`[AutoCoupon] Created coupon ${couponCode} for ${userEmail} for event ${autoCouponEvent.eventTitle}`);

          if (event.url) {
            const registrationLink = `${event.url}?coupon=${couponCode}`;
            try {
              await sendCouponNotificationEmail(userEmail, {
                eventTitle: event.title,
                discountPercent: discountPercent || 0,
                registrationLink,
                expirationDate: undefined,
              });
              console.log(`[AutoCoupon] Sent coupon notification email to ${userEmail}`);
            } catch (emailError) {
              console.error(`[AutoCoupon] Failed to send coupon email to ${userEmail}:`, emailError);
            }
          }

        } catch (eventError) {
          const errorMessage = eventError instanceof Error ? eventError.message : String(eventError);
          results.errors.push(`Failed for event ${autoCouponEvent.eventApiId}: ${errorMessage}`);
          console.error(`[AutoCoupon] Error processing event ${autoCouponEvent.eventApiId}:`, eventError);
        }
      }

      console.log(`[AutoCoupon] Completed for ${userEmail}: ${results.couponsCreated} coupons created from ${results.eventsProcessed} events`);

      return results;
    } catch (error) {
      console.error(`[AutoCoupon] Error generating coupons for ${userEmail}:`, error);
      throw error;
    }
  }
}
