import { useQuery } from "@tanstack/react-query";
import {
  sortSponsorTiers,
  tiersWithHistoricalValues,
  resolveSponsorTier,
  SPONSOR_PRESENTATIONS,
  type SponsorTierDefinition,
} from "@shared/sponsorTiers";

export const SPONSOR_TIERS_QUERY_KEY = ["/api/sponsor-tiers"] as const;

/** One catalog for admin forms and public displays; never substitute an old tier list. */
export function useSponsorTiers() {
  const query = useQuery<{ tiers: SponsorTierDefinition[] }>({
    queryKey: SPONSOR_TIERS_QUERY_KEY,
    // Pick up additions made by another admin when returning to an open tab/form.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const tiers = sortSponsorTiers(query.data?.tiers ?? []);
  return {
    ...query,
    tiers,
    defaultTier: tiers.find((tier) => tier.isDefault)?.key ?? "",
    ready: query.isSuccess && !query.isError,
  };
}

export { tiersWithHistoricalValues, resolveSponsorTier, SPONSOR_PRESENTATIONS };
export type { SponsorTierDefinition };
