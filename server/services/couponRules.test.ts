import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runCouponBackfill,
  selectBackfillRecipients,
  type CouponLike,
  type CouponMember,
} from "./couponRules";

test("backfill picks active members without a coupon for the event, once per email", () => {
  const members: CouponMember[] = [
    { id: 1, email: "has@example.com" },
    { id: 2, email: "Needs@Example.com" },
    { id: 3, email: null },
    { id: 4, email: "needs@example.com" }, // same email, different account
    { id: 5, email: "renamed@example.com" }, // coupon recorded under their user id with an old email
    { id: 6, email: "redeemed@example.com" },
  ];
  const coupons = [
    { recipientEmail: "HAS@example.com", recipientUserId: null },
    { recipientEmail: "old@example.com", recipientUserId: 5 },
    { recipientEmail: "redeemed@example.com", recipientUserId: 6 },
    { recipientEmail: null, recipientUserId: null }, // general-use code
  ];
  const { recipients, alreadyHave, total } = selectBackfillRecipients(members, coupons);
  assert.deepEqual(recipients.map((r) => r.id), [2]);
  assert.equal(alreadyHave, 3);
  assert.equal(total, 4);
});

/** In-memory coupon store standing in for the database and Luma. */
function fakeStore(options: { failLumaFor?: Set<string> } = {}) {
  const coupons: (CouponLike & { emails: number })[] = [];
  let nextId = 1;
  const emailsSent: string[] = [];
  const lumaCodes = new Set<string>();
  return {
    coupons,
    emailsSent,
    lumaCodes,
    deps(members: CouponMember[]) {
      return {
        listActiveMembers: async () => members,
        listEventCoupons: async () => coupons.map((c) => ({ ...c })),
        issue: async (member: CouponMember & { email: string }) => {
          // Mirrors issueMemberCoupon: re-check, Luma, record, email; Luma failure saves nothing
          if (coupons.some((c) => c.recipientEmail?.toLowerCase() === member.email.toLowerCase())) return "skipped" as const;
          if (options.failLumaFor?.has(member.email)) throw new Error("Luma unavailable");
          const code = `SUMMIT-${member.id}`;
          lumaCodes.add(code);
          coupons.push({ id: nextId++, code, recipientEmail: member.email, recipientUserId: member.id, lumaCouponApiId: `lm-${code}`, source: "internal", emails: 1 });
          emailsSent.push(member.email);
          return "created" as const;
        },
        retryLuma: async (coupon: CouponLike) => {
          lumaCodes.add(coupon.code);
          const saved = coupons.find((c) => c.id === coupon.id)!;
          saved.lumaCouponApiId = `lm-${coupon.code}`;
        },
      };
    },
  };
}

test("repeated backfills never give a member a second coupon, even after a partial failure", async () => {
  const members: CouponMember[] = [
    { id: 1, email: "a@example.com" },
    { id: 2, email: "b@example.com" },
    { id: 3, email: "c@example.com" },
  ];
  const failing = new Set(["b@example.com"]);
  const store = fakeStore({ failLumaFor: failing });

  const first = await runCouponBackfill(store.deps(members));
  assert.equal(first.issued, 2);
  assert.equal(first.failed, 1);
  assert.equal(first.skipped, 0);
  assert.match(first.errors[0], /b@example.com/);

  // Luma recovers; only the member who failed gets a coupon
  failing.clear();
  const second = await runCouponBackfill(store.deps(members));
  assert.deepEqual({ issued: second.issued, skipped: second.skipped, failed: second.failed }, { issued: 1, skipped: 2, failed: 0 });

  const third = await runCouponBackfill(store.deps(members));
  assert.deepEqual({ issued: third.issued, skipped: third.skipped, failed: third.failed }, { issued: 0, skipped: 3, failed: 0 });

  assert.equal(store.coupons.length, 3);
  assert.deepEqual([...store.emailsSent].sort(), ["a@example.com", "b@example.com", "c@example.com"]);
});

test("a member issued concurrently between selection and issue is skipped, not duplicated", async () => {
  const store = fakeStore();
  const members: CouponMember[] = [{ id: 7, email: "race@example.com" }];
  const deps = store.deps(members);
  // Another request (e.g. the Stripe webhook) issues first, after the backfill listed coupons
  const racing = { ...deps, listEventCoupons: async () => [] as CouponLike[] };
  await deps.issue({ id: 7, email: "race@example.com" });
  const result = await runCouponBackfill(racing);
  assert.deepEqual({ issued: result.issued, skipped: result.skipped }, { issued: 0, skipped: 1 });
  assert.equal(store.coupons.length, 1);
  assert.equal(store.emailsSent.length, 1);
});

test("backfill retries records missing a Luma coupon with the same code and no new email", async () => {
  const store = fakeStore();
  store.coupons.push(
    { id: 50, code: "OLD-9-ABCD", recipientEmail: "legacy@example.com", recipientUserId: 9, lumaCouponApiId: null, source: "internal", emails: 1 },
    { id: 51, code: "IMPORTED", recipientEmail: null, recipientUserId: null, lumaCouponApiId: null, source: "luma", emails: 0 },
  );
  const members: CouponMember[] = [{ id: 9, email: "legacy@example.com" }];

  const first = await runCouponBackfill(store.deps(members));
  assert.equal(first.lumaRetried, 1);
  assert.equal(first.issued, 0);
  assert.equal(first.skipped, 1);
  assert.ok(store.lumaCodes.has("OLD-9-ABCD"));
  assert.equal(store.emailsSent.length, 0);
  assert.equal(store.coupons.length, 2);

  // Once linked it isn't retried again
  const second = await runCouponBackfill(store.deps(members));
  assert.equal(second.lumaRetried, 0);
});

