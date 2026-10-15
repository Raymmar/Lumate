import { useCurrentSummit, isSummitPast } from "./use-summits";
import { useUserCoupons } from "./use-user-coupons";
import { couponRegistrationUrl, selectSummitCoupon } from "@shared/summitTicket";
import type { SummitWithSponsor } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useSubscription } from "./use-subscription";

/** The same authenticated, event-specific claim state for tickets and heroes. */
export function useSummitClaim(summit: SummitWithSponsor | null | undefined) {
  const { user, isLoading: authLoading, error: authError } = useAuth();
  const subscription = useSubscription();
  const coupons = useUserCoupons();
  const claim = user && !authLoading && !authError && !coupons.isError && summit
    ? selectSummitCoupon(coupons.data?.coupons ?? [], summit.lumaEventApiId)
    : undefined;
  const pending = authLoading || (!!user && (coupons.isPending || (!claim && subscription.isLoading)));
  const lookupError = !!authError || (!!user && (coupons.isError || (!claim && subscription.isError)));
  const onRetry = () => {
    if (authError) window.location.reload();
    else if (user) { void coupons.refetch(); void subscription.refetch(); }
  };
  return {
    claim, claimUrl: claim ? couponRegistrationUrl(claim.eventUrl, claim.code) : null,
    coupons, pending, lookupError, onRetry, hasActiveSubscription: subscription.hasActiveSubscription,
  };
}

export function useSummitTicket() {
  const { data: currentSummit } = useCurrentSummit();
  const summit = currentSummit && !isSummitPast(currentSummit) ? currentSummit : null;
  return { summit, ...useSummitClaim(summit) };
}
