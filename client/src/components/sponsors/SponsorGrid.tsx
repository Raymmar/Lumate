import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { YearSponsor } from "@shared/schema";
import { SponsorCard } from "./SponsorCard";
import { SponsorModal, type SponsorDetails } from "./SponsorModal";
import { AddSponsorToYearDialog, ChangeTierDialog } from "./SponsorYearDialogs";
import { SPONSOR_TIERS } from "./sponsorConfig";
import { apiErrorMessage, invalidateSponsorQueries } from "./sponsorApi";
import { generateSponsorInquiryEmail } from "@/lib/sponsorUtils";
import { useCurrentSummit } from "@/hooks/use-summits";

interface SponsorGridProps {
  /** Sponsor year; defaults to the current summit's year */
  year?: number;
  title?: string;
  icon?: React.ReactNode;
  showBecomeSponsorCTA?: boolean;
  tiers?: string[];
}

/** What the admin is doing: adding to the year, creating a new sponsor, or editing details. */
type AdminDialog =
  | { kind: "add"; presetTier?: string }
  | { kind: "create"; name: string; tier?: string }
  | { kind: "edit"; sponsor: SponsorDetails }
  | null;

export function SponsorGrid({
  year: yearProp,
  title = "Sponsors",
  icon,
  showBecomeSponsorCTA = true,
  tiers,
}: SponsorGridProps) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const [changingTier, setChangingTier] = useState<YearSponsor | null>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: currentSummit, isLoading: currentSummitLoading } = useCurrentSummit();
  const year = yearProp ?? currentSummit?.year ?? new Date().getFullYear();

  const { data, isLoading: sponsorsLoading } = useQuery<{ sponsors: YearSponsor[] }>({
    queryKey: [`/api/sponsors?year=${year}`],
    enabled: yearProp !== undefined || !currentSummitLoading,
  });
  const isLoading = sponsorsLoading || (yearProp === undefined && currentSummitLoading);

  // Removes only this year's sponsorship; the sponsor and its other years stay
  const removeMutation = useMutation({
    mutationFn: (sponsor: YearSponsor) => apiRequest(`/api/sponsorships/${sponsor.sponsorshipId}`, "DELETE"),
    onSuccess: async (_result, sponsor) => {
      await invalidateSponsorQueries();
      toast({ title: "Removed", description: `${sponsor.name} removed from ${sponsor.year}` });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: apiErrorMessage(error, "Failed to remove sponsor from this year"),
        variant: "destructive",
      });
    },
  });

  const isAdmin = (user as any)?.isAdmin || (user as any)?.is_admin;
  const sponsors = data?.sponsors || [];

  const handleRemove = (sponsor: YearSponsor) => {
    if (window.confirm(`Remove ${sponsor.name} from ${sponsor.year}? Their other years and details are kept.`)) {
      removeMutation.mutate(sponsor);
    }
  };

  if (isLoading) {
    return (
      <Card className="border w-full max-w-full">
        <CardHeader className="p-3 md:p-4">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border w-full max-w-full overflow-hidden">
        <CardHeader className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {showBecomeSponsorCTA && (
                <a
                  href={generateSponsorInquiryEmail()}
                  className="flex-1 sm:flex-none"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-become-sponsor"
                    className="w-full sm:w-auto whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Become a Sponsor</span>
                    <span className="sm:hidden">Sponsor</span>
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setDialog({ kind: "add" })}
                  data-testid="button-add-sponsor"
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sponsor
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 space-y-8">
          {SPONSOR_TIERS.filter((tier) => !tiers || tiers.includes(tier.key)).map((tier) => {
            const tierSponsors = sponsors.filter((s) => s.tier === tier.key);

            return (
              <div key={tier.key} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  )}
                </div>

                {tierSponsors.length === 0 ? (
                  isAdmin && (
                    <div className="flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialog({ kind: "add", presetTier: tier.key })}
                        className="flex items-center gap-2"
                        data-testid={`button-add-sponsor-${tier.key}`}
                      >
                        <Plus className="h-5 w-5" />
                        <span>Add sponsor to {tier.name}</span>
                      </Button>
                    </div>
                  )
                ) : (
                  <div
                    className={`grid gap-4 ${
                      tier.cols === 1
                        ? "grid-cols-1"
                        : tier.cols === 2
                          ? "grid-cols-1 sm:grid-cols-2"
                          : tier.cols === 3
                            ? "grid-cols-2 md:grid-cols-3"
                            : tier.cols === 4
                              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    }`}
                  >
                    {tierSponsors.map((sponsor) => (
                      <SponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        isAdmin={isAdmin}
                        onEdit={(s) => setDialog({ kind: "edit", sponsor: s })}
                        onChangeTier={setChangingTier}
                        onRemove={handleRemove}
                        removeLabel={`Remove from ${year}`}
                      />
                    ))}

                    {tier.key === "Seed" && tierSponsors.length % 2 === 1 && showBecomeSponsorCTA && (
                      <a
                        href={generateSponsorInquiryEmail()}
                        className="block"
                        data-testid="cta-become-sponsor-seed"
                      >
                        <div className="flex flex-col h-full items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-muted-foreground/50 transition-colors">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>Become a Sponsor</span>
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <AddSponsorToYearDialog
            year={year}
            open={dialog?.kind === "add"}
            presetTier={dialog?.kind === "add" ? dialog.presetTier : undefined}
            onClose={() => setDialog(null)}
            onCreateNew={(name, tier) => setDialog({ kind: "create", name, tier })}
          />
          <ChangeTierDialog sponsorship={changingTier} onClose={() => setChangingTier(null)} />
        </>
      )}

      {dialog?.kind === "create" && (
        <SponsorModal
          sponsor={null}
          initialName={dialog.name}
          year={year}
          defaultTier={dialog.tier}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "edit" && (
        <SponsorModal sponsor={dialog.sponsor} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
