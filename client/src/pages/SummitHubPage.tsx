import { Link } from "wouter";
import { ArrowRight, Calendar, Loader2, MapPin } from "lucide-react";
import type { SummitWithSponsor as Summit } from "@shared/schema";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/ui/seo";
import { useAuth } from "@/hooks/use-auth";
import { formatSummitDate, isSummitPast, useCurrentSummit, useSummits } from "@/hooks/use-summits";
import { SummitPageShell } from "@/components/summit/SummitPageShell";
import { SummitHero } from "@/components/summit/SummitHero";

const DEFAULT_SEO_IMAGE =
  "https://file-upload.replit.app/api/storage/images%2F1761584634963-Thumbnail-Main.png";

function ArchiveCard({ summit }: { summit: Summit }) {
  const image = summit.heroImage || summit.galleryImages?.[0]?.src || summit.seoImage;
  return (
    <Link href={`/summit/${summit.year}`} className="block no-underline hover:no-underline group" data-testid={`card-summit-archive-${summit.year}`}>
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {image && (
            <img
              src={image}
              alt={`${summit.title} ${summit.year}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <span className="absolute top-3 left-3 bg-background/90 rounded-md px-2 py-1 text-lg font-bold">
            {summit.year}
          </span>
          {!summit.isPublished && (
            <Badge variant="secondary" className="absolute top-3 right-3">
              Draft
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {summit.title} {summit.year}
          </h3>
          {summit.tagline && <p className="text-sm text-muted-foreground">{summit.tagline}</p>}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatSummitDate(summit)}
            </p>
            {summit.venueName && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {summit.venueName}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            View summit <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

/** /summit — features the current or upcoming summit and archives past years. */
export default function SummitHubPage() {
  const { user } = useAuth();
  const { data: featured, isLoading: featuredLoading } = useCurrentSummit();
  const { data: summits = [], isLoading: summitsLoading } = useSummits();

  const archive = summits.filter((s) => s.id !== featured?.id);

  return (
    <SummitPageShell>
      <SEO
        title="Sarasota Tech Summit"
        description={featured?.tagline || "Florida's premier tech event"}
        image={featured?.seoImage || featured?.heroImage || DEFAULT_SEO_IMAGE}
      />

      {featuredLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : featured ? (
        <SummitHero summit={featured} isPast={isSummitPast(featured) && !featured.isCurrent} showLearnMore />
      ) : (
        <PageContainer className="max-w-3xl py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Sarasota Tech Summit</h1>
          <p className="text-muted-foreground">Details for the next summit are coming soon.</p>
        </PageContainer>
      )}

      <div className="flex-1 relative z-10">
        <PageContainer className="max-w-7xl py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Summit Archive</h2>
            {user?.isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/summits">Manage summits</Link>
              </Button>
            )}
          </div>
          {summitsLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : archive.length === 0 ? (
            <p className="text-muted-foreground">Past summits will appear here.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="list-summit-archive">
              {archive.map((summit) => (
                <ArchiveCard key={summit.id} summit={summit} />
              ))}
            </div>
          )}
        </PageContainer>
      </div>
    </SummitPageShell>
  );
}
