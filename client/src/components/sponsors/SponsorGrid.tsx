import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Sponsor } from "@shared/schema";
import { SponsorCard } from "./SponsorCard";
import { SponsorModal } from "./SponsorModal";
import { SPONSOR_TIERS } from "./sponsorConfig";
import { generateSponsorInquiryEmail } from "@/lib/sponsorUtils";

interface SponsorGridProps {
  year?: number;
  title?: string;
  icon?: React.ReactNode;
  showBecomeSponsorCTA?: boolean;
}

export function SponsorGrid({
  year = new Date().getFullYear(),
  title = "Sponsors",
  icon,
  showBecomeSponsorCTA = true,
}: SponsorGridProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data, isLoading } = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: [`/api/sponsors?year=${year}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sponsors/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sponsors?year=${year}`] });
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sponsor",
        variant: "destructive",
      });
    },
  });

  const isAdmin = (user as any)?.isAdmin || (user as any)?.is_admin;
  const sponsors = data?.sponsors || [];

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this sponsor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingSponsor(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSponsor(null);
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
                  onClick={handleAddNew}
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
          {SPONSOR_TIERS.map((tier) => {
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
                        onClick={handleAddNew}
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
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : tier.cols === 4
                              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    }`}
                  >
                    {tierSponsors.map((sponsor) => (
                      <SponsorCard
                        key={sponsor.id}
                        sponsor={sponsor}
                        isAdmin={isAdmin}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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

      {isModalOpen && (
        <SponsorModal
          sponsor={editingSponsor}
          onClose={handleCloseModal}
          year={year}
        />
      )}
    </>
  );
}
