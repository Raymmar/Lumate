import { useLocation } from "wouter";
import { useSummitTicket } from "@/hooks/use-summit-ticket";
import { SummitTicketOffer } from "./SummitTicketOffer";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isSummitTicketDismissed,
  SUMMIT_TICKET_DISMISSAL_COOKIE,
  SUMMIT_TICKET_DISMISSAL_SECONDS,
} from "@/lib/summit-ticket-dismissal";

/** Sell recurring membership to nonsubscribers, including people with granted Premium access. */
export function CurrentSummitTicket() {
  const [dismissal, setDismissal] = useState(() =>
    typeof document === "undefined" ? "" :
      document.cookie.split("; ").find(cookie => cookie.startsWith(`${SUMMIT_TICKET_DISMISSAL_COOKIE}=`))?.split("=")[1] ?? "",
  );
  const { summit, claim, pending, lookupError: failed, onRetry, hasActiveSubscription } = useSummitTicket();
  const [, navigate] = useLocation();
  const { data: price } = useQuery<{ formattedPrice: string; interval: string | null }>({
    queryKey: ["/api/stripe/premium-price"],
    staleTime: 300_000,
  });
  if (!summit) return null;
  if (isSummitTicketDismissed(dismissal, summit.id)) return null;
  if (!pending && !failed && !claim && hasActiveSubscription) return null;

  const dismiss = () => {
    const value = `${summit.id}:${Date.now() + SUMMIT_TICKET_DISMISSAL_SECONDS * 1000}`;
    document.cookie = `${SUMMIT_TICKET_DISMISSAL_COOKIE}=${value}; Max-Age=${SUMMIT_TICKET_DISMISSAL_SECONDS}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    setDismissal(value);
  };

  return (
    <div className="relative py-4" data-testid="current-summit-ticket">
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
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-6 z-10 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
        aria-label="Dismiss Summit ticket for one week"
        title="Hide for one week"
        data-testid="button-dismiss-summit-ticket"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
