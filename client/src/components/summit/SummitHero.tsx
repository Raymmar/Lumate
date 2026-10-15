import { Calendar, ExternalLink, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { SummitWithSponsor as Summit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatSummitDate } from "@/hooks/use-summits";

interface SummitHeroProps {
  summit: Summit;
  isPast: boolean;
  showLearnMore?: boolean;
}

/** Split hero: event imagery on the left, summit details and ticket link on the right. */
export function SummitHero({ summit, isPast, showLearnMore = false }: SummitHeroProps) {
  const ticketLabel = isPast ? "Event Page" : "Get Tickets";
  // The linked sponsor's current name and link; the old text fields only when none is linked
  const sponsor = summit.presentingSponsor;
  const linked = summit.presentingSponsorId != null;
  const presenterName = sponsor ? sponsor.name : linked ? null : summit.presentedByName;
  const presenterUrl = sponsor ? sponsor.url : linked ? null : summit.presentedByUrl;

  return (
    <div className="w-full">
      <div className="grid lg:grid-cols-2 min-h-[50vh] lg:min-h-[600px]" style={{ minHeight: "max(50vh, 500px)" }}>
        {/* Left Side - Full Background Image */}
        <div className="relative min-h-[50vh] lg:min-h-[70vh] bg-muted" style={{ minHeight: "max(50vh, 500px)" }}>
          {summit.heroImage && (
            <img
              src={summit.heroImage}
              alt={`${summit.title} ${summit.year}`}
              className="absolute inset-0 w-full h-full object-cover rounded-r-lg"
            />
          )}
          {summit.logoImage && (
            <img
              src={summit.logoImage}
              alt={`${summit.title} logo`}
              className="absolute top-5 left-5 w-48 sm:w-64 md:w-80 lg:w-96 h-auto max-w-[calc(100%-2.5rem)]"
            />
          )}
          {summit.dateBlockImage && (
            <img
              src={summit.dateBlockImage}
              alt="Event Date"
              className="absolute w-full max-w-full md:w-96 lg:w-128 h-auto"
              style={{ bottom: "-4%", right: "0%" }}
            />
          )}
        </div>

        {/* Right Side - Event Information */}
        <div className="bg-background flex items-center p-8 lg:p-12">
          <div className="w-full max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6" data-testid="text-summit-title">
              {summit.title}
            </h1>

            {summit.tagline && (
              <p className="text-xl md:text-2xl font-semibold mb-4 text-foreground">{summit.tagline}</p>
            )}

            <div className="space-y-3 mb-8 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <span className="text-lg" data-testid="text-summit-date">{formatSummitDate(summit)}</span>
              </div>
              {summit.venueName && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-1" />
                  <div>
                    {summit.venueMapUrl ? (
                      <a href={summit.venueMapUrl} target="_blank" rel="noopener noreferrer" className="text-lg underline">
                        {summit.venueName}
                      </a>
                    ) : (
                      <span className="text-lg">{summit.venueName}</span>
                    )}
                    {summit.venueAddress && <p className="text-sm">{summit.venueAddress}</p>}
                  </div>
                </div>
              )}
            </div>

            {summit.description && (
              <p className="text-lg text-muted-foreground mb-8 whitespace-pre-line">{summit.description}</p>
            )}

            {(summit.ticketUrl || showLearnMore) && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {summit.ticketUrl && (
                  <Button asChild size="lg" className="text-base w-full sm:w-auto" data-testid="button-summit-tickets">
                    <a href={summit.ticketUrl} target="_blank" rel="noopener noreferrer">
                      {ticketLabel}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                {showLearnMore && (
                  <Button asChild variant="outline" size="lg" className="text-base w-full sm:w-auto">
                    <Link href={`/summit/${summit.year}`} data-testid="button-summit-learn-more">
                      Learn more
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {presenterName && (
              <p className="text-md text-muted-foreground mt-6" data-testid="summit-presented-by">
                Presented by{" "}
                {presenterUrl ? (
                  <a href={presenterUrl} target="_blank" rel="noopener noreferrer">
                    {presenterName}
                  </a>
                ) : (
                  presenterName
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
