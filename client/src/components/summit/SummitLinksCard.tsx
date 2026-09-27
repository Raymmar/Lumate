import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import type { Summit } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSponsorInquiryEmail } from "@/lib/sponsorUtils";

interface SummitLinksCardProps {
  summit: Summit;
  /** Other published summit years to link to as archives. */
  otherSummits: Summit[];
  showSponsorCta: boolean;
}

function ExternalLinkButton({ label, href, testId }: { label: string; href: string; testId?: string }) {
  const isInternal = href.startsWith("/");
  const button = (
    <Button
      variant="outline"
      className="w-full justify-between font-normal hover:bg-muted"
      data-testid={testId}
    >
      <span className="flex items-center gap-2">{label}</span>
      <ExternalLink className="h-4 w-4" />
    </Button>
  );
  if (isInternal) {
    return (
      <Link href={href} className="block">
        {button}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {button}
    </a>
  );
}

export function SummitLinksCard({ summit, otherSummits, showSponsorCta }: SummitLinksCardProps) {
  const links = summit.links ?? [];
  const [firstLink, ...restLinks] = links;

  return (
    <Card className="border w-full max-w-full overflow-hidden" data-testid="card-summit-links">
      <CardHeader className="p-3 md:p-4 pb-3">
        <CardTitle>Event Links</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-4">
        <div className="flex flex-col gap-3">
          {firstLink && <ExternalLinkButton label={firstLink.label} href={firstLink.url} />}
          {showSponsorCta && (
            <a href={generateSponsorInquiryEmail()} className="block">
              <Button
                variant="outline"
                className="w-full justify-between font-normal hover:bg-muted"
                data-testid="button-become-sponsor-event-links"
              >
                <span className="flex items-center gap-2">Become a Sponsor</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          {restLinks.map((link, index) => (
            <ExternalLinkButton key={`${link.url}-${index}`} label={link.label} href={link.url} />
          ))}
          {otherSummits.map((other) => (
            <Button
              key={other.id}
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
              asChild
            >
              <Link href={`/summit/${other.year}`} data-testid={`link-summit-archive-${other.year}`}>
                {other.year} Summit{other.year < summit.year ? " Archive" : ""}
              </Link>
            </Button>
          ))}
          <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted" asChild>
            <Link href="/about">About Sarasota Tech</Link>
          </Button>

          {summit.videoEmbedUrl && (
            <div className="mt-4 w-full max-w-full">
              <div className="relative w-full max-w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={summit.videoEmbedUrl}
                  title={`${summit.title} ${summit.year} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  data-testid="video-youtube-embed"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
