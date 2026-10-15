import { useState } from "react";
import { Link } from "wouter";
import { Calendar, Loader2, MailCheck, MapPin, Ticket } from "lucide-react";
import type { SummitWithSponsor as Summit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatSummitDate } from "@/hooks/use-summits";
import ticketBackground from "@/assets/summit-ticket-background.png";
import { couponRegistrationUrl, type TicketCoupon } from "@shared/summitTicket";

interface SummitTicketOfferProps {
  summit: Summit;
  /** Live Premium price, e.g. "$250"; null while loading or unavailable. */
  price: string | null;
  interval: string;
  isPremium: boolean;
  /** Starts the regular Premium checkout (signed-in or guest). */
  onBuy: () => Promise<void>;
  disabled?: boolean;
  claim?: TicketCoupon;
  pending?: boolean;
  lookupError?: boolean;
  onRetry?: () => void;
}

// Summit artwork rings; the perforation notches are cut with the page background colour.
const TICKET_BACKGROUND = `url(${ticketBackground}) center bottom / cover no-repeat, #000`;

/** Premium membership presented as a Summit ticket; the membership itself comes free with it. */
export function SummitTicketOffer({ summit, price, interval, isPremium, onBuy, disabled, claim, pending, lookupError, onRetry }: SummitTicketOfferProps) {
  const [isStarting, setIsStarting] = useState(false);
  const priceText = price ?? "…";
  const renewal = price ? `${price}/${interval}` : `the Premium price each ${interval}`;
  const claimUrl = claim && couponRegistrationUrl(claim.eventUrl, claim.code);

  const handleBuy = async () => {
    setIsStarting(true);
    try {
      await onBuy();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section aria-labelledby="summit-ticket-heading" className="space-y-3" data-testid="summit-ticket-offer">
      <div
        className="relative flex flex-col md:flex-row overflow-hidden rounded-2xl text-white shadow-xl shadow-black/20"
        style={{ background: TICKET_BACKGROUND }}
      >
        {/* Main ticket body */}
        <div className="relative flex-1 p-6 sm:p-8 md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEA30E] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-black">
            <Ticket className="h-3.5 w-3.5" /> Admit one
          </span>
          <h2 id="summit-ticket-heading" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {summit.title} <span className="text-[#FEA30E]">{summit.year}</span>
          </h2>
          <p className="mt-2 text-lg text-white/80">{claimUrl ? "Your Summit ticket is ready to claim. Complete your registration on Luma." : "Your Summit ticket, with a year of Premium membership included free."}</p>
          <div className="mt-6 grid gap-2 text-white/80">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-[#FEA30E]" />
              <span data-testid="text-ticket-date">{formatSummitDate(summit)}</span>
            </div>
            {summit.venueName && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 shrink-0 text-[#FEA30E]" />
                <span>
                  {summit.venueName}
                  {summit.venueAddress && <span className="block text-sm text-white/60">{summit.venueAddress}</span>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Perforation with notches: horizontal on phones, vertical from md up */}
        <div aria-hidden className="relative md:w-0">
          <div className="mx-6 border-t-2 border-dashed border-white/30 md:mx-0 md:my-6 md:h-[calc(100%-3rem)] md:border-t-0 md:border-l-2" />
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background md:left-1/2 md:top-0 md:-translate-x-1/2 md:-translate-y-1/2" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background md:left-1/2 md:right-auto md:top-auto md:bottom-0 md:-translate-x-1/2 md:translate-y-1/2" />
        </div>

        {/* Stub: price and action */}
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 md:w-80 md:p-10 bg-black/40">
          {pending ? (
            <p role="status" className="text-white/80"><Loader2 className="mb-2 h-6 w-6 animate-spin" />Checking your ticket…</p>
          ) : lookupError ? (
            <div role="alert" className="space-y-2">
              <p>We couldn't check your ticket. Please try again before purchasing.</p>
              <Button variant="secondary" onClick={onRetry}>Try again</Button>
            </div>
          ) : claimUrl && claim ? (
            <div className="space-y-3" data-testid="ticket-offer-claim">
              <p className="text-xl font-bold">Your ticket coupon</p>
              <code className="block break-all rounded bg-white/10 p-3 text-lg">{claim.code}</code>
              <Button asChild size="lg" className="w-full bg-[#FEA30E] hover:bg-[#E5930D] text-black font-semibold">
                <a href={claimUrl} target="_blank" rel="noopener noreferrer" data-testid="button-claim-summit-ticket">Claim your ticket</a>
              </Button>
              <p className="text-sm text-white/80">You must finish registration on Luma. This coupon is not a completed registration. Confirmation here may take time to sync.</p>
            </div>
          ) : isPremium ? (
            <div className="space-y-2" data-testid="ticket-offer-member">
              <MailCheck className="h-8 w-8 text-[#FEA30E]" />
              <p className="text-xl font-bold">You're a Premium member</p>
              <p className="text-white/80">
                Your Premium access is active. No available coupon was found for this Summit.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold" data-testid="text-ticket-price">{priceText}</span>
                </div>
                <p className="mt-1 font-semibold text-[#FEA30E]">Premium membership included</p>
              </div>
              <Button
                size="lg"
                className="w-full bg-[#FEA30E] hover:bg-[#E5930D] text-black font-semibold"
                onClick={handleBuy}
                disabled={disabled || isStarting}
                data-testid="button-buy-summit-ticket"
              >
                {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get your ticket
              </Button>
            </>
          )}
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            data-testid="button-ticket-learn-more"
          >
            <Link href={`/summit/${summit.year}`}>Learn more</Link>
          </Button>
        </div>
      </div>
      {!isPremium && !claimUrl && !pending && !lookupError && (
        <p className="text-sm text-muted-foreground" data-testid="text-ticket-terms">
          Checkout starts an annual Premium membership that renews automatically at {renewal} until you cancel.
          Any issued Summit coupon will appear in your account settings.
        </p>
      )}
    </section>
  );
}
