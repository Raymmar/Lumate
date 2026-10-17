/** Supported layouts, not tier identities. Keep these aligned with existing logo layouts. */
export const SPONSOR_PRESENTATIONS = {
  hero: { label: "1 column", cols: 1, squareLogo: false, inquiryFiller: false },
  pair: { label: "2 columns", cols: 2, squareLogo: true, inquiryFiller: true },
  standard: { label: "4 columns", cols: 4, squareLogo: true, inquiryFiller: false },
  compact: { label: "5 columns", cols: 5, squareLogo: true, inquiryFiller: false },
  // Retain the stored key; this legacy preset uses the same five-column grid.
  community: { label: "5 columns", cols: 5, squareLogo: true, inquiryFiller: false },
} as const;

export type SponsorPresentation = keyof typeof SPONSOR_PRESENTATIONS;
export interface SponsorTierDefinition {
  key: string;
  name: string;
  description: string | null;
  position: number;
  presentation: SponsorPresentation;
  isDefault: boolean;
}

export function sortSponsorTiers(tiers: SponsorTierDefinition[]): SponsorTierDefinition[] {
  return [...tiers].sort((a, b) => a.position - b.position || a.key.localeCompare(b.key));
}

/** Historical strings are readable even if imported after initialization. Never discard them. */
export function resolveSponsorTier(tiers: SponsorTierDefinition[], key: string): SponsorTierDefinition {
  return tiers.find(t => t.key === key) ?? {
    key, name: key || "Unclassified", description: null,
    position: 2147483647, presentation: "standard", isDefault: false,
  };
}

export function tiersWithHistoricalValues(tiers: SponsorTierDefinition[], keys: string[]): SponsorTierDefinition[] {
  return sortSponsorTiers([...tiers, ...[...new Set(keys)].filter(key => !tiers.some(t => t.key === key))
    .map(key => resolveSponsorTier(tiers, key))]);
}
