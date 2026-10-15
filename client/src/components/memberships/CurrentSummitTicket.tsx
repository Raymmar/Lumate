import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useSummitTicket } from "@/hooks/use-summit-ticket";
import { SummitTicketOffer } from "./SummitTicketOffer";
import { useQuery } from "@tanstack/react-query";

/** Home offers membership; account settings shows only an actual claimable ticket. */
export function CurrentSummitTicket({ claimOnly = false }: { claimOnly?: boolean }) {
  const { user, isLoading: authLoading, error: authError } = useAuth();
  const { isPremium, isLoading: subscriptionLoading, isError: subscriptionError, refetch: refetchSubscription } = useSubscription();
  const { summit, claim, coupons } = useSummitTicket();
  const [, navigate] = useLocation();
  const { data: price } = useQuery<{ formattedPrice: string; interval: string | null }>({
    queryKey: ["/api/stripe/premium-price"],
    staleTime: 300_000,
    enabled: !claimOnly,
  });
  if (!summit) return null;
  const pending = authLoading || (!!user && (coupons.isPending || (!claim && subscriptionLoading)));
  const failed = !!authError || (!!user && (coupons.isError || (!claim && subscriptionError)));
  if (!pending && !failed && !claim && (claimOnly || isPremium)) return null;
  return (
    <div className="py-4" data-testid="current-summit-ticket">
      <SummitTicketOffer
        summit={summit}
        price={price?.formattedPrice ?? null}
        interval={price?.interval ?? "year"}
        isPremium={!!isPremium}
        claim={claim}
        pending={pending}
        lookupError={failed}
        onRetry={() => {
          if (authError) window.location.reload();
          else if (user) { void coupons.refetch(); void refetchSubscription(); }
        }}
        onBuy={async () => { navigate("/memberships"); }}
      />
    </div>
  );
}
