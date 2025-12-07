import { storage } from "../storage";
import { db } from "../db";
import { coupons, events } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface LumaCoupon {
  api_id: string;
  code: string;
  currency: string | null;
  remaining_count: number;
  valid_start_at: string | null;
  valid_end_at: string | null;
  percent_off: number | null;
  cents_off: number | null;
}

interface LumaCouponsResponse {
  entries: LumaCoupon[];
  has_more: boolean;
  next_cursor: string | null;
}

async function fetchAllLumaCouponsForEvent(eventApiId: string): Promise<LumaCoupon[]> {
  const allCoupons: LumaCoupon[] = [];
  let hasMore = true;
  let cursor: string | undefined;
  let page = 1;

  while (hasMore) {
    const params = new URLSearchParams({
      event_api_id: eventApiId,
      ...(cursor ? { pagination_cursor: cursor } : {}),
    });

    const response = await fetch(
      `https://public-api.luma.com/v1/event/coupons?${params}`,
      {
        headers: {
          "x-luma-api-key": process.env.LUMA_API_KEY || "",
          "accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch coupons for event ${eventApiId}:`, errorText);
      throw new Error(`Failed to fetch coupons: ${response.status}`);
    }

    const data: LumaCouponsResponse = await response.json();
    allCoupons.push(...data.entries);

    hasMore = data.has_more;
    cursor = data.next_cursor || undefined;
    console.log(`[CouponSync] Fetched page ${page} for event ${eventApiId}: ${data.entries.length} coupons, hasMore: ${hasMore}`);
    page++;
  }

  return allCoupons;
}

export async function syncCouponsForEvent(eventApiId: string): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  try {
    const lumaCoupons = await fetchAllLumaCouponsForEvent(eventApiId);
    console.log(`[CouponSync] Found ${lumaCoupons.length} coupons in Luma for event ${eventApiId}`);

    const eventData = await db
      .select()
      .from(events)
      .where(eq(events.api_id, eventApiId))
      .limit(1);

    const eventTitle = eventData[0]?.title || null;
    const eventUrl = eventData[0]?.url || null;

    for (const lumaCoupon of lumaCoupons) {
      try {
        const existingCoupons = await db
          .select()
          .from(coupons)
          .where(
            and(
              eq(coupons.eventApiId, eventApiId),
              eq(coupons.code, lumaCoupon.code)
            )
          )
          .limit(1);

        const existingCoupon = existingCoupons[0];
        const newStatus = lumaCoupon.remaining_count === 0 ? 'redeemed' : 'issued';

        if (existingCoupon) {
          const wasUnredeemed = existingCoupon.status !== 'redeemed';
          const isNowRedeemed = newStatus === 'redeemed';
          
          await db
            .update(coupons)
            .set({
              remainingCount: lumaCoupon.remaining_count,
              status: newStatus,
              lumaCouponApiId: lumaCoupon.api_id,
              validStartAt: lumaCoupon.valid_start_at,
              validEndAt: lumaCoupon.valid_end_at,
              ...(wasUnredeemed && isNowRedeemed ? { redeemedAt: new Date().toISOString() } : {}),
            })
            .where(eq(coupons.id, existingCoupon.id));

          result.updated++;
          
          if (wasUnredeemed && isNowRedeemed) {
            console.log(`[CouponSync] Coupon ${lumaCoupon.code} marked as redeemed`);
          }
        } else {
          await db.insert(coupons).values({
            eventApiId,
            eventTitle,
            eventUrl,
            code: lumaCoupon.code,
            lumaCouponApiId: lumaCoupon.api_id,
            discountPercent: lumaCoupon.percent_off,
            centsOff: lumaCoupon.cents_off,
            validStartAt: lumaCoupon.valid_start_at,
            validEndAt: lumaCoupon.valid_end_at,
            status: newStatus,
            remainingCount: lumaCoupon.remaining_count,
            source: 'luma',
            recipientEmail: null,
            recipientUserId: null,
            recipientPersonId: null,
            issuedByUserId: null,
          });

          result.created++;
          console.log(`[CouponSync] Imported new coupon from Luma: ${lumaCoupon.code} (${newStatus})`);
        }

        result.synced++;
      } catch (couponError) {
        const errorMsg = `Failed to sync coupon ${lumaCoupon.code}: ${couponError instanceof Error ? couponError.message : String(couponError)}`;
        console.error(`[CouponSync] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(`[CouponSync] Completed sync for event ${eventApiId}: ${result.synced} synced, ${result.created} created, ${result.updated} updated`);
  } catch (error) {
    const errorMsg = `Failed to sync coupons for event ${eventApiId}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[CouponSync] ${errorMsg}`);
    result.errors.push(errorMsg);
  }

  return result;
}

export async function syncCouponsForAllEvents(): Promise<{
  eventsProcessed: number;
  totalSynced: number;
  totalCreated: number;
  totalUpdated: number;
  errors: string[];
}> {
  const result = {
    eventsProcessed: 0,
    totalSynced: 0,
    totalCreated: 0,
    totalUpdated: 0,
    errors: [] as string[],
  };

  try {
    const futureEvents = await storage.getFutureEvents();
    console.log(`[CouponSync] Starting coupon sync for ${futureEvents.length} future events`);

    for (const event of futureEvents) {
      try {
        const eventResult = await syncCouponsForEvent(event.api_id);
        result.eventsProcessed++;
        result.totalSynced += eventResult.synced;
        result.totalCreated += eventResult.created;
        result.totalUpdated += eventResult.updated;
        result.errors.push(...eventResult.errors);
      } catch (error) {
        const errorMsg = `Failed to sync coupons for event ${event.api_id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[CouponSync] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log(`[CouponSync] Completed full sync: ${result.eventsProcessed} events, ${result.totalSynced} coupons synced`);
  } catch (error) {
    const errorMsg = `Failed to sync coupons: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[CouponSync] ${errorMsg}`);
    result.errors.push(errorMsg);
  }

  return result;
}
