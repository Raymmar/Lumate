import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { SponsorCard } from "./SponsorCard";
import type { YearSponsor } from "@shared/schema";
import { getAnnualSponsorYear } from "@shared/sponsorYear";

interface SingleSponsorProps {
  sponsorId: number;
  /** Defaults to the annual calendar year; pass a year for historical displays. */
  year?: number;
  isAdmin?: boolean;
  onEdit?: (sponsor: YearSponsor) => void;
  showAdminControls?: boolean;
}

/** One year's sponsor card, using that year's tier, never a future or expired tier. */
export function SingleSponsor({
  sponsorId,
  year = getAnnualSponsorYear(),
  isAdmin = false,
  onEdit,
  showAdminControls = true,
}: SingleSponsorProps) {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data, isLoading } = useQuery<{ sponsor: YearSponsor }>({
    queryKey: [`/api/sponsors/${sponsorId}?year=${year}`],
  });

  const effectiveIsAdmin = showAdminControls && (isAdmin || (user as any)?.isAdmin || (user as any)?.is_admin);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (!data?.sponsor) {
    return null;
  }

  return (
    <SponsorCard
      sponsor={data.sponsor}
      isAdmin={effectiveIsAdmin}
      onEdit={onEdit}
    />
  );
}
