import { useLocation } from "wouter";
import { useSummitTicket } from "@/hooks/use-summit-ticket";
import { SummitTicketOffer } from "./SummitTicketOffer";
import { useQuery } from "@tanstack/react-query";

/** Sell recurring membership to nonsubscribers, including people with granted Premium access. */
export function CurrentSummitTicket() {
  const { summit, claim, pending, lookupError: failed, onRetry, hasActiveSubscription } = useSummitTicket();
  const [, navigate] = useLocation();
  const { data: price } = useQuery<{ formattedPrice: string; interval: string | null }>({
    queryKey: ["/api/stripe/premium-price"],
    staleTime: 300_000,
  });
  if (!summit) return null;
  if (!pending && !failed && !claim && hasActiveSubscription) return null;
  return (
    <div className="py-4" data-testid="current-summit-ticket">
      <SummitTicketOffer
        summit={summit}
        price={price?.formattedPrice ?? null}
        interval={price?.interval ?? "year"}
        hasActiveSubscription={hasActiveSubscription}
        claim={claim}
        pending={pending}
        lookupError={failed}
        onRetry={onRetry}
        onBuy={async () => { navigate("/memberships"); }}
      />
    </div>
  );
}
