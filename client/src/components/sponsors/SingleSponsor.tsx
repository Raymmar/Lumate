import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { SponsorCard } from "./SponsorCard";
import type { YearSponsor } from "@shared/schema";

interface SingleSponsorProps {
  sponsorId: number;
  isAdmin?: boolean;
  onEdit?: (sponsor: YearSponsor) => void;
  showAdminControls?: boolean;
}

/** One sponsor's card (global details, sized by their most recent tier). */
export function SingleSponsor({
  sponsorId,
  isAdmin = false,
  onEdit,
  showAdminControls = true,
}: SingleSponsorProps) {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data, isLoading } = useQuery<{ sponsor: YearSponsor }>({
    queryKey: [`/api/sponsors/${sponsorId}`],
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
