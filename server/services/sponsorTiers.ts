import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { sponsorTiers } from "@shared/schema";
import { SPONSOR_PRESENTATIONS, sortSponsorTiers, type SponsorPresentation, type SponsorTierDefinition } from "@shared/sponsorTiers";

// One-time definitions only. Runtime lists and defaults always come from the catalog.
const initialTiers: SponsorTierDefinition[] = [
  { key: "Series A", name: "Series A", position: 100, presentation: "hero", isDefault: true, description: null },
  { key: "Seed", name: "Seed", position: 200, presentation: "pair", isDefault: false, description: null },
  { key: "Angel", name: "Angel", position: 300, presentation: "standard", isDefault: false, description: null },
  { key: "Friends & Family", name: "Friends & Family", position: 400, presentation: "compact", isDefault: false, description: null },
  { key: "501c3/.edu", name: "501c3/.edu", position: 500, presentation: "community", isDefault: false, description: "Nonprofit & education sponsors" },
];

/** Data only; never updates configured metadata or existing sponsor relationships. */
export async function initializeSponsorTiers() {
  await db.transaction(async tx => {
    await tx.insert(sponsorTiers).values(initialTiers).onConflictDoNothing();
    await tx.execute(sql`
      INSERT INTO sponsor_tiers (key, name, position, presentation, is_default)
      SELECT tier, tier, 1000000, 'standard', false FROM (
        SELECT tier FROM sponsorships UNION SELECT tier FROM sponsors WHERE tier IS NOT NULL
      ) historical
      ON CONFLICT DO NOTHING
    `);
  });
}

export async function getSponsorTiers(): Promise<SponsorTierDefinition[]> {
  const tiers = await db.select().from(sponsorTiers);
  if (!tiers.length || tiers.filter(t => t.isDefault).length !== 1) {
    throw new Error("Sponsor tier configuration is unavailable");
  }
  return sortSponsorTiers(tiers);
}

export class InvalidSponsorTierError extends Error {}

/** Strict new assignments; explicitly retained historical values stay compatible. */
export async function resolveAssignmentTier(key?: string, retainedTier?: string | null): Promise<string> {
  const tiers = await getSponsorTiers();
  if (key === undefined) return tiers.find(t => t.isDefault)!.key;
  if (tiers.some(t => t.key === key) || key === retainedTier) return key;
  throw new InvalidSponsorTierError("Select a configured sponsorship tier");
}

export const createSponsorTierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).transform(v => v.replace(/\s+/g, " ")),
  description: z.string().trim().max(1000).nullable().optional(),
  position: z.number().int().min(-1000000).max(1000000),
  presentation: z.enum(Object.keys(SPONSOR_PRESENTATIONS) as [SponsorPresentation, ...SponsorPresentation[]]),
}).strict();

// Names, stable keys and the automatic default are deliberately not editable.
export const updateSponsorTierSchema = createSponsorTierSchema
  .omit({ name: true })
  .partial()
  .refine(input => Object.keys(input).length > 0, "Provide tier options to update");

export async function updateSponsorTier(key: string, input: z.infer<typeof updateSponsorTierSchema>) {
  const data = updateSponsorTierSchema.parse(input);
  await getSponsorTiers();
  const [tier] = await db.update(sponsorTiers).set(data).where(eq(sponsorTiers.key, key)).returning();
  return tier ?? null;
}

export class DuplicateSponsorTierError extends Error {}

export async function createSponsorTier(input: z.infer<typeof createSponsorTierSchema>) {
  return db.transaction(async tx => {
    // Serializes add-only admin writes without restricting encountered legacy labels.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73429151)`);
    const existing = await tx.select().from(sponsorTiers);
    if (existing.some(t => t.name.trim().replace(/\s+/g, " ").toLowerCase() === input.name.toLowerCase())) {
      throw new DuplicateSponsorTierError("A sponsorship tier with that name already exists");
    }
    const [tier] = await tx.insert(sponsorTiers).values({
      ...input, description: input.description || null,
      key: `tier-${randomUUID()}`, isDefault: false,
    }).returning();
    return tier;
  });
}
