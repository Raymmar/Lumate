/** A missing remote coupon is unavailable, not a completed registration. */
export function missingLumaCouponIds(
  local: { id: number; code: string; lumaCouponApiId: string | null; status: string }[],
  remote: { code: string }[],
): number[] {
  const availableCodes = new Set(remote.map(c => c.code));
  return local.filter(c => c.status === "issued" && c.lumaCouponApiId && !availableCodes.has(c.code))
    .map(c => c.id);
}
