import { useCurrentSummit, isSummitPast } from "./use-summits";
import { useUserCoupons } from "./use-user-coupons";
import { selectSummitCoupon } from "@shared/summitTicket";

export function useSummitTicket() {
  const { data: currentSummit } = useCurrentSummit();
  const coupons = useUserCoupons();
  const summit = currentSummit && !isSummitPast(currentSummit) ? currentSummit : null;
  const claim = !coupons.isError && summit
    ? selectSummitCoupon(coupons.data?.coupons ?? [], summit.lumaEventApiId)
    : undefined;
  return { summit, claim, coupons };
}
