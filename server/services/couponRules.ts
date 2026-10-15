// Pure coupon rules (no database or network access) so they can be unit tested.

/** The fields of a saved coupon these rules look at. */
export interface CouponLike {
  id: number;
  code: string;
  recipientEmail: string | null;
  recipientUserId: number | null;
  lumaCouponApiId: string | null;
  source: string;
}

export interface CouponMember {
  id: number;
  email: string | null;
  personId?: number | null;
}

/** True when a coupon for this event already belongs to the member (by user or email, any status). */
export function couponBelongsTo(coupon: Pick<CouponLike, "recipientEmail" | "recipientUserId">, member: { id: number | null; email: string }): boolean {
  if (member.id != null && coupon.recipientUserId === member.id) return true;
  return !!coupon.recipientEmail && coupon.recipientEmail.trim().toLowerCase() === member.email.trim().toLowerCase();
}

/**
 * Active Premium members who still need a coupon for an event: they have an email and
 * no coupon for the event yet (whatever its status). Each email is picked once.
 */
export function selectBackfillRecipients<M extends CouponMember>(
  members: M[],
  eventCoupons: Pick<CouponLike, "recipientEmail" | "recipientUserId">[],
): { recipients: (M & { email: string })[]; alreadyHave: number; total: number } {
  const ownedEmails = new Set(
    eventCoupons.filter((c) => c.recipientEmail).map((c) => c.recipientEmail!.trim().toLowerCase()),
  );
  const ownedUserIds = new Set(eventCoupons.map((c) => c.recipientUserId).filter((id): id is number => id != null));
  const seen = new Set<string>();
  const recipients: (M & { email: string })[] = [];
  let alreadyHave = 0;
  let total = 0;
  for (const member of members) {
    const email = member.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    total++;
    if (ownedEmails.has(email) || ownedUserIds.has(member.id)) {
      alreadyHave++;
      continue;
    }
    recipients.push(member as M & { email: string });
  }
  return { recipients, alreadyHave, total };
}

/** Site coupon records that were saved without a matching Luma coupon. */
export function couponsMissingLuma<C extends CouponLike>(eventCoupons: C[]): C[] {
  return eventCoupons.filter((c) => !c.lumaCouponApiId && c.source !== "luma");
}

export interface BackfillResult {
  issued: number;
  skipped: number;
  failed: number;
  lumaRetried: number;
  lumaRetryFailed: number;
  errors: string[];
}

export interface BackfillDeps<M extends CouponMember, C extends CouponLike> {
  listActiveMembers(): Promise<M[]>;
  listEventCoupons(): Promise<C[]>;
  /** Issues one coupon; re-checks for an existing coupon under a lock and returns "skipped" when found. Throws on failure. */
  issue(member: M & { email: string }): Promise<"created" | "skipped">;
  /** Creates (or links) the Luma coupon for an existing site record using the same code. Never emails. Throws on failure. */
  retryLuma(coupon: C): Promise<void>;
  /** Optional pause between Luma calls to stay under rate limits. */
  pause?(): Promise<void>;
}

/**
 * Gives every active Premium member who is missing a coupon for the event one coupon, and
 * retries Luma for site records that never got a Luma coupon. Safe to run repeatedly.
 */
export async function runCouponBackfill<M extends CouponMember, C extends CouponLike>(
  deps: BackfillDeps<M, C>,
): Promise<BackfillResult> {
  const result: BackfillResult = { issued: 0, skipped: 0, failed: 0, lumaRetried: 0, lumaRetryFailed: 0, errors: [] };
  const eventCoupons = await deps.listEventCoupons();

  for (const coupon of couponsMissingLuma(eventCoupons)) {
    try {
      await deps.retryLuma(coupon);
      result.lumaRetried++;
    } catch (error) {
      result.lumaRetryFailed++;
      result.errors.push(`Luma retry failed for ${coupon.code}: ${errorText(error)}`);
    }
    await deps.pause?.();
  }

  const { recipients, alreadyHave } = selectBackfillRecipients(await deps.listActiveMembers(), eventCoupons);
  result.skipped = alreadyHave;
  for (const member of recipients) {
    try {
      const outcome = await deps.issue(member);
      if (outcome === "created") result.issued++;
      else result.skipped++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed for ${member.email}: ${errorText(error)}`);
    }
    await deps.pause?.();
  }
  return result;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

