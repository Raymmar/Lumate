/** Only Luma registration URLs are allowed for coupon claims. */
export function couponRegistrationUrl(eventUrl: string | null, code: string): string | null {
  if (!eventUrl || !code.trim()) return null;
  try {
    const url = new URL(eventUrl);
    if (url.protocol !== "https:" || !["lu.ma", "luma.com"].includes(url.hostname) ||
        url.username || url.password || url.port || url.pathname === "/") return null;
    url.searchParams.set("coupon", code);
    return url.toString();
  } catch {
    return null;
  }
}

export interface TicketCoupon {
  id: number;
  eventApiId: string;
  eventTitle: string | null;
  eventUrl: string | null;
  code: string;
  discountPercent: number | null;
  status: string;
  lumaCouponApiId: string | null;
  remainingCount: number | null;
  validStartAt: string | null;
  validEndAt: string | null;
}

export function isUsableTicketCoupon(coupon: TicketCoupon, now = Date.now()): boolean {
  return coupon.status === "issued" && !!coupon.lumaCouponApiId &&
    coupon.remainingCount !== null && coupon.remainingCount > 0 &&
    (!coupon.validStartAt || Date.parse(coupon.validStartAt) <= now) &&
    (!coupon.validEndAt || Date.parse(coupon.validEndAt) > now) &&
    !!couponRegistrationUrl(coupon.eventUrl, coupon.code);
}

export function selectSummitCoupon(
  coupons: TicketCoupon[], eventApiId: string | null | undefined, now = Date.now(),
): TicketCoupon | undefined {
  if (!eventApiId) return undefined;
  return coupons.find(coupon => coupon.eventApiId === eventApiId && isUsableTicketCoupon(coupon, now));
}
