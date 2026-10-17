import { useState } from "react";
import { Calendar, Loader2, MailCheck, MapPin, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ticketBackground from "./summit-ticket-background.png";

export type OriginalTicketState = "buy" | "claim" | "dismissed";

type SummitPresentation = {
  title: string;
  year: number | string;
  dateLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
};

interface SummitTicketOfferProps {
  summit: SummitPresentation;
  price?: string | null;
  interval?: string;
  hasActiveSubscription?: boolean;
  onBuy?: () => Promise<void> | void;
  disabled?: boolean;
  state?: Exclude<OriginalTicketState, "dismissed">;
  onDismiss?: () => void;
}

const TICKET_BACKGROUND = `url(${ticketBackground}) center bottom / cover no-repeat, #000`;

function formatSummitDate(summit: SummitPresentation) {
  if (summit.dateLabel) return summit.dateLabel;
  if (!summit.startDate) return "Date to be announced";
  const [year, month, day] = summit.startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  if (Number.isNaN(start.getTime())) return summit.startDate;
  const format = (date: Date) => date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const startText = format(start);
  if (!summit.endDate || summit.endDate === summit.startDate) return startText;
  const [endYear, endMonth, endDay] = summit.endDate.split("-").map(Number);
  const end = new Date(endYear, endMonth - 1, endDay);
  return !Number.isNaN(end.getTime())
    ? `${startText} – ${format(end)}`
    : format(start);
}

/** Copied Summit ticket offer; network and external registration actions are intentionally absent. */
export function SummitTicketOffer({
  summit,
  price = "$250",
  interval = "year",
  hasActiveSubscription = false,
  onBuy,
  disabled,
  state = "buy",
}: SummitTicketOfferProps) {
  const [isStarting, setIsStarting] = useState(false);
  const priceText = price ?? "…";
  const renewal = price ? `${price}/${interval}` : `the membership price each ${interval}`;

  const handleBuy = async () => {
    setIsStarting(true);
    try {
      await onBuy?.();
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
        <div className="relative flex-1 p-6 sm:p-8 md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEA30E] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-black">
            <Ticket className="h-3.5 w-3.5" /> Admit one
          </span>
          <h2 id="summit-ticket-heading" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            {summit.title} <span className="text-[#FEA30E]">{summit.year}</span>
          </h2>
          <p className="mt-2 text-lg text-white/80">
            {state === "claim"
              ? "Your Summit ticket is ready to claim. Complete your registration on Luma."
              : hasActiveSubscription
                ? "Your recurring membership is active. Ticket availability is specific to each Summit."
                : "Your Summit ticket, with an annual membership included."}
          </p>
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

        <div aria-hidden className="relative md:w-0">
          <div className="mx-6 border-t-2 border-dashed border-white/30 md:mx-0 md:my-6 md:h-[calc(100%-3rem)] md:border-t-0 md:border-l-2" />
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background md:left-1/2 md:top-0 md:-translate-x-1/2 md:-translate-y-1/2" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background md:left-1/2 md:right-auto md:top-auto md:bottom-0 md:-translate-x-1/2 md:translate-y-1/2" />
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 md:w-80 md:p-10 bg-black/40">
          {state === "claim" ? (
            <div className="space-y-3" data-testid="ticket-offer-claim">
              <p className="text-xl font-bold">Your Summit ticket</p>
              <p className="text-white/80">Claim preview — registration is disabled in this sandbox.</p>
              <Button size="lg" className="w-full h-11 px-8 rounded-md ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-[#FEA30E] hover:bg-[#E5930D] text-black font-semibold" disabled>
                Claim your ticket
              </Button>
            </div>
          ) : hasActiveSubscription ? (
            <div className="space-y-2" data-testid="ticket-offer-member">
              <MailCheck className="h-8 w-8 text-[#FEA30E]" />
              <p className="text-xl font-bold">Your membership is active</p>
              <p className="text-white/80">No available coupon was found for this Summit.</p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold" data-testid="text-ticket-price">{priceText}</span>
                </div>
                <p className="mt-1 font-semibold text-[#FEA30E]">Annual membership included</p>
              </div>
              <Button
                size="lg"
                className="w-full h-11 px-8 rounded-md ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-[#FEA30E] hover:bg-[#E5930D] text-black font-semibold"
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
            className="w-full h-11 px-8 rounded-md ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            data-testid="button-ticket-learn-more"
          >
            <a href="#summit">Learn more</a>
          </Button>
        </div>
      </div>
      {!hasActiveSubscription && state !== "claim" && (
        <p className="text-sm text-muted-foreground" data-testid="text-ticket-terms">
          Checkout starts an annual membership that renews automatically at {renewal} until you cancel.
        </p>
      )}
    </section>
  );
}

interface OriginalTicketProps {
  summit?: SummitPresentation;
  state?: OriginalTicketState;
  price?: string | null;
  interval?: string;
}

/** Isolated, reusable full-width ticket with local-only dismiss behavior. */
export function OriginalTicket({
  summit,
  state: initialState = "buy",
  price = "$250",
  interval,
}: OriginalTicketProps) {
  const [dismissed, setDismissed] = useState(initialState === "dismissed");
  if (dismissed) return null;
  const defaultSummit: SummitPresentation = summit ?? {
    title: "Sarasota Tech Summit",
    year: 2025,
    venueName: "Sarasota, Florida",
  };
  return (
    <div className="relative py-4" data-testid="current-summit-ticket">
      <SummitTicketOffer
        summit={defaultSummit}
        price={price}
        interval={interval}
        state={initialState === "claim" ? "claim" : "buy"}
        onBuy={() => undefined}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-6 z-10 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
        aria-label="Dismiss Summit ticket"
        title="Hide ticket"
        data-testid="button-dismiss-summit-ticket"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
