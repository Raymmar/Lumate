import assert from "node:assert/strict";
import { test } from "node:test";
import { couponRegistrationUrl, isUsableTicketCoupon, selectSummitCoupon, type TicketCoupon } from "./summitTicket";
import { missingLumaCouponIds } from "../server/services/couponAvailability";
import { isSummitPast } from "../client/src/hooks/use-summits";

const now = Date.parse("2026-10-15T12:00:00Z");
const coupon: TicketCoupon = {
  id: 1, eventApiId: "evt-summit", eventTitle: "Anything", eventUrl: "https://lu.ma/summit?utm_source=member#register",
  code: "A B&+", discountPercent: 100, status: "issued", lumaCouponApiId: "coupon-1",
  remainingCount: 1, validStartAt: null, validEndAt: null,
};

test("claim matches only the linked event, never a title or year", () => {
  const unrelated = { ...coupon, id: 2, eventApiId: "other", eventTitle: "Summit 2026" };
  assert.equal(selectSummitCoupon([unrelated, coupon], "evt-summit", now)?.id, 1);
  assert.equal(selectSummitCoupon([unrelated], "evt-summit", now), undefined);
  assert.equal(selectSummitCoupon([coupon], null, now), undefined);
});

test("claim requires issued, remotely created, usable coupon with valid dates and link", () => {
  assert.equal(isUsableTicketCoupon(coupon, now), true);
  const invalid: Partial<TicketCoupon>[] = [
    { status: "redeemed" }, { status: "expired" }, { status: "pending" },
    { remainingCount: 0 }, { remainingCount: -1 }, { remainingCount: null },
    { lumaCouponApiId: null }, { code: "" }, { eventUrl: null },
    { validStartAt: "2026-10-16T00:00:00Z" }, { validStartAt: "invalid" },
    { validEndAt: "2026-10-15T12:00:00Z" }, { validEndAt: "invalid" },
  ];
  for (const patch of invalid) assert.equal(isUsableTicketCoupon({ ...coupon, ...patch }, now), false, JSON.stringify(patch));
  assert.equal(isUsableTicketCoupon({ ...coupon, validStartAt: new Date(now).toISOString(), validEndAt: "2026-10-16T00:00:00Z" }, now), true);
});

test("registration URL preserves parameters and fragment and encodes coupon exactly once", () => {
  const url = new URL(couponRegistrationUrl(coupon.eventUrl, coupon.code)!);
  assert.equal(url.searchParams.get("coupon"), coupon.code);
  assert.equal(url.searchParams.get("utm_source"), "member");
  assert.equal(url.hash, "#register");
  assert.equal(new URL(couponRegistrationUrl("https://luma.com/event?coupon=old", "NEW")!).searchParams.getAll("coupon").length, 1);
  for (const unsafe of ["javascript:alert(1)", "https://lu.ma.evil.test/event", "https://evil.test/event", "http://lu.ma/event", "/event", "https://lu.ma/", "https://user@lu.ma/event"]) {
    assert.equal(couponRegistrationUrl(unsafe, "CODE"), null);
  }
});

test("only remotely removed issued coupons become unavailable during normal sync", () => {
  const local = [coupon, { ...coupon, id: 2, code: "removed" }, { ...coupon, id: 3, code: "redeemed", status: "redeemed" }, { ...coupon, id: 4, code: "not-created", lumaCouponApiId: null }];
  assert.deepEqual(missingLumaCouponIds(local, [{ code: coupon.code }]), [2]);
});

test("visibility keeps existing final-day cutoff, missing dates, and current lookup semantics", () => {
  // These dates intentionally sit far from today: use the existing helper, not a new cutoff.
  assert.equal(isSummitPast({ startDate: "2000-01-01", endDate: null } as any), true);
  assert.equal(isSummitPast({ startDate: "2099-01-01", endDate: null } as any), false);
  assert.equal(isSummitPast({ startDate: "2000-01-01", endDate: "2099-01-02" } as any), false);
  assert.equal(isSummitPast({ startDate: null, endDate: null } as any), false);
});
