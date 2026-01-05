export interface SponsorTier {
  name: string;
  key: string;
  cols: number;
  description?: string;
}

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    name: "Series A",
    key: "Series A",
    cols: 1,
  },
  {
    name: "Seed",
    key: "Seed",
    cols: 2,
  },
  {
    name: "Angel",
    key: "Angel",
    cols: 4,
  },
  {
    name: "Friends & Family",
    key: "Friends & Family",
    cols: 5,
  },
  {
    name: "501c3/.edu",
    key: "501c3/.edu",
    cols: 7,
    description: "Nonprofit & education sponsors",
  },
];
