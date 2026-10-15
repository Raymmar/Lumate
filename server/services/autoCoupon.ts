import { storage } from "../storage";
import { getEventByApiId, issueMemberCoupon, specFromRule } from "./memberCoupons";

export class AutoCouponService {
  /**
   * Issues coupons from every active new-member rule. Safe to call more than once for the
   * same purchase (webhook, checkout confirmation, reconciliation): members who already
   * have a coupon for an event are skipped.
   */
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

    console.log(`[AutoCoupon] Checking auto-coupon events for new subscriber: ${userEmail} (user ${userId})`);

    const activeAutoCouponEvents = await storage.getActiveAutoCouponEvents();
    if (activeAutoCouponEvents.length === 0) {
      console.log(`[AutoCoupon] No active auto-coupon events found`);
      return results;
    }

    const matchedPerson = await storage.getPersonByEmail(userEmail);
    const personId = matchedPerson?.id || null;

    for (const rule of activeAutoCouponEvents) {
      results.eventsProcessed++;
      try {
        const event = await getEventByApiId(rule.eventApiId);
        if (!event) {
          console.log(`[AutoCoupon] Event ${rule.eventApiId} not found in database, skipping`);
          continue;
        }
        const outcome = await issueMemberCoupon(specFromRule(rule, event, null), {
          email: userEmail,
          userId,
          personId,
          codeId: userId,
        });
        if (outcome.status === "created") {
          results.couponsCreated++;
          console.log(`[AutoCoupon] Created coupon ${outcome.coupon.code} for ${userEmail} for event ${event.title}`);
        } else {
          console.log(`[AutoCoupon] User ${userEmail} already has a coupon for event ${rule.eventApiId}, skipping`);
        }
      } catch (eventError) {
        // Nothing was saved or emailed; the admin backfill picks this member up later
        const errorMessage = eventError instanceof Error ? eventError.message : String(eventError);
        results.errors.push(`Failed for event ${rule.eventApiId}: ${errorMessage}`);
        console.error(`[AutoCoupon] Error processing event ${rule.eventApiId}:`, eventError);
      }
    }

    console.log(`[AutoCoupon] Completed for ${userEmail}: ${results.couponsCreated} coupons created from ${results.eventsProcessed} events`);
    return results;
  }
}
