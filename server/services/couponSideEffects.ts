/** Non-production environments may hold real Luma and SendGrid credentials. */
export function couponSideEffectsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === "production" || env.ENABLE_DEV_COUPONS === "true";
}

export const COUPONS_DISABLED_MESSAGE =
  "Coupon creation and coupon emails are disabled outside production. No coupons were created or sent. Set ENABLE_DEV_COUPONS=true only if you intend to create real Luma coupons and email real members.";

export function assertCouponSideEffectsEnabled(): void {
  if (!couponSideEffectsEnabled()) throw new Error(COUPONS_DISABLED_MESSAGE);
}
