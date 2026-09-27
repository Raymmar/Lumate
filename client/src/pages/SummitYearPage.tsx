import { Building2, Loader2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/ui/seo";
import { SponsorGrid } from "@/components/sponsors";
import { AgendaSection } from "@/components/agenda";
import { useAuth } from "@/hooks/use-auth";
import { isSummitPast, useSummit, useSummits } from "@/hooks/use-summits";
import { SummitPageShell } from "@/components/summit/SummitPageShell";
import { SummitHero } from "@/components/summit/SummitHero";
import { SummitHighlights } from "@/components/summit/SummitHighlights";
import { AgendaUpdatesAlert } from "@/components/summit/AgendaUpdatesAlert";
import { SummitLinksCard } from "@/components/summit/SummitLinksCard";
import { SummitNewsSection } from "@/components/summit/SummitNewsSection";
import { SummitGalleryCard } from "@/components/summit/SummitGalleryCard";
import { SummitSpeakersSection } from "@/components/summit/SummitSpeakersSection";

const DEFAULT_SEO_IMAGE =
  "https://file-upload.replit.app/api/storage/images%2F1761584634963-Thumbnail-Main.png";

/** The standard page for one summit year: /summit/:year */
export default function SummitYearPage() {
  const params = useParams<{ year: string }>();
  const year = /^\d{4}$/.test(params.year ?? "") ? parseInt(params.year!, 10) : null;
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const { data: summit, isLoading } = useSummit(year);
  const { data: summits = [] } = useSummits();

  if (isLoading) {
    return (
      <SummitPageShell>
        <div className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SummitPageShell>
    );
  }

  if (!summit) {
    return (
      <SummitPageShell>
        <PageContainer className="max-w-3xl py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Summit not found</h1>
          <p className="text-muted-foreground mb-8">
            {year ? `There's no published ${year} summit page.` : "That summit page doesn't exist."}
          </p>
          <Button asChild>
            <Link href="/summit">See all summits</Link>
          </Button>
        </PageContainer>
      </SummitPageShell>
    );
  }

  const isPast = isSummitPast(summit);
  // Current or upcoming summits keep sponsor and sign-up calls to action
  const isActive = summit.isCurrent || !isPast;
  const otherSummits = summits.filter((s) => s.id !== summit.id && s.isPublished);

  return (
    <SummitPageShell>
      <SEO
        title={`${summit.title} ${summit.year}`}
        description={summit.tagline || "Florida's premier tech event"}
        image={summit.seoImage || summit.heroImage || DEFAULT_SEO_IMAGE}
      />
      {!summit.isPublished && (
        <div className="relative z-10 bg-amber-100 text-amber-900 text-sm text-center py-2" data-testid="banner-summit-draft">
          Draft — this summit page is only visible to admins.{" "}
          <Link href="/admin/summits" className="underline">
            Manage summits
          </Link>
        </div>
      )}
      <SummitHero summit={summit} isPast={isPast && !summit.isCurrent} />

      <div className="flex-1">
        <PageContainer className="max-w-7xl py-12">
          <SummitHighlights highlights={summit.highlights ?? []} />

          {summit.isCurrent && <AgendaUpdatesAlert />}

          {/* Event Agenda Section */}
          <div className="mb-12">
            <AgendaSection isAdmin={isAdmin} summitYear={summit.year} summitId={summit.id} />
          </div>

          <SummitSpeakersSection year={summit.year} />

          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left Sidebar - Event Links */}
              <div className="lg:col-span-1 space-y-4">
                <SummitLinksCard summit={summit} otherSummits={otherSummits} showSponsorCta={isActive} />
              </div>

              {/* Right Content - News Feed, Sponsors, and Gallery */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                <SummitNewsSection summit={summit} />
                <SponsorGrid
                  year={summit.year}
                  title={isActive ? "Summit Sponsors" : `${summit.year} Sponsors`}
                  icon={<Building2 className="h-5 w-5" />}
                  showBecomeSponsorCTA={isActive}
                />
                <SummitGalleryCard images={summit.galleryImages ?? []} photosUrl={summit.photosUrl} />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </SummitPageShell>
  );
}
