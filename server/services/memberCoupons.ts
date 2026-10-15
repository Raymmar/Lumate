import { and, eq, or, sql } from "drizzle-orm";
import { coupons, events, people, type AutoCouponEvent, type Coupon, type Event } from "@shared/schema";
import { db, pool } from "../db";
import { storage } from "../storage";
import { sendCouponNotificationEmail } from "../email";
import { lumaApiRequest } from "./lumaHelpers";
import { fetchAllLumaCouponsForEvent } from "./couponSyncService";
import {
  couponsMissingLuma,
  runCouponBackfill,
  selectBackfillRecipients,
  type BackfillResult,
} from "./couponRules";

/** What every coupon in a batch shares. */
export interface CouponSpec {
  eventApiId: string;
  eventTitle: string;
  eventUrl: string | null;
  ticketTypeId: string | null;
  ticketTypeName: string | null;
  discountType: string;
  discountPercent: number | null;
  centsOff: number | null;
  validStartAt?: string | null;
  validEndAt?: string | null;
  issuedByUserId: number | null;
}

export interface CouponRecipientInfo {
  email: string;
  userId: number | null;
  personId: number | null;
  /** Number embedded in the generated code (user or person id). */
  codeId: number;
}

function generateCouponCode(eventTitle: string, recipientId: number): string {
  const prefix = eventTitle.replace(/[^a-zA-Z0-9]/g, "").substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${recipientId}-${random}`.substring(0, 20);
}

function lumaDiscount(discountType: string, discountPercent: number | null, centsOff: number | null) {
  return discountType === "percent"
    ? { discount_type: "percent", percent_off: discountPercent }
    : { discount_type: "cents", cents_off: centsOff };
}

/** Creates a coupon in Luma with the given code and returns Luma's coupon id. */
async function createLumaCoupon(fields: {
  code: string;
  eventApiId: string;
  remainingCount: number;
  discountType: string;
  discountPercent: number | null;
  centsOff: number | null;
  ticketTypeId?: string | null;
  validStartAt?: string | null;
  validEndAt?: string | null;
}): Promise<string | null> {
  const payload: Record<string, unknown> = {
    code: fields.code,
    event_api_id: fields.eventApiId,
    remaining_count: fields.remainingCount,
    discount: lumaDiscount(fields.discountType, fields.discountPercent, fields.centsOff),
  };
  if (fields.ticketTypeId) payload.ticket_api_ids = [fields.ticketTypeId];
  if (fields.validStartAt) payload.valid_start_at = fields.validStartAt;
  if (fields.validEndAt) payload.valid_end_at = fields.validEndAt;
  const response = await lumaApiRequest("event/create-coupon", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response?.coupon?.api_id || null;
}

/**
 * Runs `fn` while holding a database advisory lock for `key`, so concurrent requests
 * (Stripe webhook, checkout confirmation, admin backfill) can't issue the same coupon twice.
 */
async function withAdvisoryLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [key]);
    locked = true;
    return await fn();
  } finally {
    let unlocked = !locked;
    if (locked) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [key]);
        unlocked = true;
      } catch (error) {
        console.error("[MemberCoupons] Failed to release coupon lock:", error);
      }
    }
    // Never return a connection that still holds the lock to the pool
    client.release(unlocked ? undefined : true);
  }
}

async function findExistingCoupon(eventApiId: string, recipient: { email: string; userId: number | null }) {
  const byEmail = sql`lower(${coupons.recipientEmail}) = ${recipient.email.trim().toLowerCase()}`;
  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(
      eq(coupons.eventApiId, eventApiId),
      recipient.userId != null ? or(byEmail, eq(coupons.recipientUserId, recipient.userId)) : byEmail,
    ))
    .limit(1);
  return existing ?? null;
}

/**
 * Issues one single-use coupon to a member: Luma first, then the site record, then the email.
 * Skips members who already have any coupon for the event. If Luma fails nothing is saved or
 * sent, so a later backfill can try again with a fresh code.
 */
export async function issueMemberCoupon(
  spec: CouponSpec,
  recipient: CouponRecipientInfo,
): Promise<{ status: "created"; coupon: Coupon } | { status: "skipped" }> {
  const email = recipient.email.trim();
  return withAdvisoryLock(`coupon:${spec.eventApiId}:${email.toLowerCase()}`, async () => {
    if (await findExistingCoupon(spec.eventApiId, { email, userId: recipient.userId })) {
      return { status: "skipped" as const };
    }

    const code = generateCouponCode(spec.eventTitle, recipient.codeId);
    console.log(`[MemberCoupons] Creating Luma coupon for ${email}: ${code}`);
    const lumaCouponApiId = await createLumaCoupon({
      code,
      eventApiId: spec.eventApiId,
      remainingCount: 1,
      discountType: spec.discountType,
      discountPercent: spec.discountPercent,
      centsOff: spec.centsOff,
      ticketTypeId: spec.ticketTypeId,
      validStartAt: spec.validStartAt,
      validEndAt: spec.validEndAt,
    });

    const coupon = await storage.createCoupon({
      eventApiId: spec.eventApiId,
      eventTitle: spec.eventTitle,
      eventUrl: spec.eventUrl,
      ticketTypeId: spec.ticketTypeId,
      ticketTypeName: spec.ticketTypeName,
      code,
      lumaCouponApiId,
      recipientUserId: recipient.userId,
      recipientPersonId: recipient.personId,
      recipientEmail: email,
      discountPercent: spec.discountPercent,
      centsOff: spec.centsOff,
      discountType: spec.discountType,
      couponType: "targeted",
      maxUses: 1,
      remainingCount: 1,
      validStartAt: spec.validStartAt || null,
      validEndAt: spec.validEndAt || null,
      status: "issued",
      issuedByUserId: spec.issuedByUserId,
    });

    if (spec.eventUrl) {
      try {
        await sendCouponNotificationEmail(email, {
          eventTitle: spec.eventTitle,
          discountPercent: spec.discountPercent || 0,
          registrationLink: `${spec.eventUrl}?coupon=${code}`,
          expirationDate: spec.validEndAt || undefined,
        });
      } catch (emailError) {
        console.error(`[MemberCoupons] Failed to send coupon email to ${email}:`, emailError);
      }
    }
    return { status: "created" as const, coupon };
  });
}

/** Coupon settings for a new-member rule, using the event's current title and link. */
export function specFromRule(rule: AutoCouponEvent, event: Event, issuedByUserId: number | null): CouponSpec {
  return {
    eventApiId: rule.eventApiId,
    eventTitle: event.title || rule.eventTitle || "",
    eventUrl: event.url || rule.eventUrl || null,
    ticketTypeId: rule.ticketTypeId || null,
    ticketTypeName: rule.ticketTypeName || null,
    discountType: rule.discountType || "percent",
    discountPercent: rule.discountPercent,
    centsOff: rule.centsOff,
    validStartAt: null,
    validEndAt: null,
    issuedByUserId,
  };
}

export async function getEventByApiId(eventApiId: string): Promise<Event | null> {
  const [event] = await db.select().from(events).where(eq(events.api_id, eventApiId)).limit(1);
  return event ?? null;
}

async function activeMembersWithPeople() {
  const members = (await storage.getActivePremiumMembers()).filter((m) => !m.blockedAt);
  const emails = members.filter((m) => m.email && !m.personId).map((m) => m.email.toLowerCase());
  const peopleRows = emails.length
    ? await db.select({ id: people.id, email: people.email }).from(people)
        .where(sql`lower(${people.email}) in (${sql.join(emails.map((e) => sql`${e}`), sql`, `)})`)
    : [];
  const personByEmail = new Map(peopleRows.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p.id]));
  return members.map((m) => ({
    id: m.id,
    email: m.email,
    personId: m.personId ?? (m.email ? personByEmail.get(m.email.toLowerCase()) ?? null : null),
  }));
}

/** How many active Premium members a backfill would reach, and how many Luma retries it would make. */
export async function previewCouponBackfill(eventApiId: string) {
  const members = (await storage.getActivePremiumMembers()).filter((m) => !m.blockedAt);
  const eventCoupons = await storage.getCoupons({ eventApiId });
  const { recipients, alreadyHave, total } = selectBackfillRecipients(members, eventCoupons);
  return {
    total,
    willReceive: recipients.length,
    alreadyHave,
    lumaRetries: couponsMissingLuma(eventCoupons).length,
  };
}

/** Sends a rule's coupon to every active Premium member who is missing one, and repairs missing Luma coupons. */
export async function runRuleBackfill(rule: AutoCouponEvent, event: Event, adminUserId: number): Promise<BackfillResult> {
  const spec = specFromRule(rule, event, adminUserId);
  let lumaCodes: Map<string, string> | null = null;

  const result = await runCouponBackfill<{ id: number; email: string | null; personId: number | null }, Coupon>({
    listActiveMembers: activeMembersWithPeople,
    listEventCoupons: () => storage.getCoupons({ eventApiId: rule.eventApiId }),
    issue: async (member) => {
      const outcome = await issueMemberCoupon(spec, {
        email: member.email,
        userId: member.id,
        personId: member.personId,
        codeId: member.id,
      });
      return outcome.status;
    },
    retryLuma: async (coupon) => {
      // The Luma coupon may exist already (e.g. the earlier response was lost); link it instead of re-creating
      if (!lumaCodes) {
        const existing = await fetchAllLumaCouponsForEvent(rule.eventApiId);
        lumaCodes = new Map(existing.map((c) => [c.code.toUpperCase(), c.api_id]));
      }
      let lumaCouponApiId = lumaCodes.get(coupon.code.toUpperCase()) ?? null;
      if (!lumaCouponApiId) {
        lumaCouponApiId = await createLumaCoupon({
          code: coupon.code,
          eventApiId: coupon.eventApiId,
          remainingCount: coupon.remainingCount ?? coupon.maxUses ?? 1,
          discountType: coupon.discountType,
          discountPercent: coupon.discountPercent,
          centsOff: coupon.centsOff,
          ticketTypeId: coupon.ticketTypeId,
          validStartAt: coupon.validStartAt,
          validEndAt: coupon.validEndAt,
        });
        if (!lumaCouponApiId) throw new Error("Luma did not return a coupon id");
      }
      await db.update(coupons).set({ lumaCouponApiId }).where(eq(coupons.id, coupon.id));
    },
    pause: () => new Promise((resolve) => setTimeout(resolve, 200)),
  });

  console.log(`[MemberCoupons] Backfill for ${rule.eventApiId}:`, { ...result, errors: result.errors.length });
  return result;
}
