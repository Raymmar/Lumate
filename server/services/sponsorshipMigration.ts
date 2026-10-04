import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { sponsors, sponsorships, summits, type Sponsor } from "@shared/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Data-only step (no DDL) that moves sponsors from "one row per sponsor per year"
 * to "one sponsor record + yearly sponsorships".
 *
 * A legacy row is one that still has its old `year`/`tier` columns set and has
 * never had a sponsorship for that year (in any state). Legacy rows describing
 * the same sponsor (same linked company, otherwise same name ignoring case and
 * surrounding whitespace) are merged into one record: the most recent year's
 * row is kept (its ID, logo, link and details), the other rows' years become
 * sponsorships of the kept record, references are repointed and the duplicates
 * are soft-deleted.
 *
 * Running it again changes nothing: migrated keepers already have their own-year
 * sponsorship and merged duplicates are soft-deleted.
 */
export type SponsorshipMigrationResult = {
  legacyRows: number;
  createdSponsorships: number;
  mergedDuplicates: number;
};

const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

async function findLegacyRows(tx: Tx): Promise<(Sponsor & { year: number; tier: string })[]> {
  const rows = await tx
    .select()
    .from(sponsors)
    .where(and(
      isNull(sponsors.deletedAt),
      sql`${sponsors.year} IS NOT NULL`,
      sql`${sponsors.tier} IS NOT NULL`,
      sql`NOT EXISTS (
        SELECT 1 FROM sponsorships ss
        WHERE ss.sponsor_id = ${sponsors.id} AND ss.year = ${sponsors.year}
      )`,
    ));
  return rows as (Sponsor & { year: number; tier: string })[];
}

/** Groups legacy rows that describe the same sponsor. */
function groupRows<T extends Sponsor>(rows: T[]): T[][] {
  const byCompany = new Map<number, T[]>();
  const byName = new Map<string, T[]>();
  for (const row of rows) {
    if (row.companyId != null) {
      const group = byCompany.get(row.companyId) ?? [];
      group.push(row);
      byCompany.set(row.companyId, group);
    }
  }
  // Rows without a company join a company group with the same name, else group by name
  const companyGroupByName = new Map<string, T[]>();
  for (const group of Array.from(byCompany.values())) {
    for (const row of group) companyGroupByName.set(normalizeName(row.name), group);
  }
  for (const row of rows) {
    if (row.companyId != null) continue;
    const key = normalizeName(row.name);
    const companyGroup = companyGroupByName.get(key);
    if (companyGroup) {
      companyGroup.push(row);
      continue;
    }
    const group = byName.get(key) ?? [];
    group.push(row);
    byName.set(key, group);
  }
  return [...Array.from(byCompany.values()), ...Array.from(byName.values())];
}

async function hasSponsorshipRow(tx: Tx, sponsorId: number, year: number): Promise<boolean> {
  const [row] = await tx
    .select({ id: sponsorships.id })
    .from(sponsorships)
    .where(and(eq(sponsorships.sponsorId, sponsorId), eq(sponsorships.year, year)))
    .limit(1);
  return Boolean(row);
}

async function migrateGroup(
  tx: Tx,
  group: (Sponsor & { year: number; tier: string })[],
  result: SponsorshipMigrationResult,
) {
  // Most recent year first; within a year the most recently created row wins
  const ordered = [...group].sort((a, b) => b.year - a.year || b.id - a.id);
  const keeper = ordered[0];
  const duplicates = ordered.slice(1);
  const duplicateIds = duplicates.map((d) => d.id);

  // One sponsorship per year: the newest row for that year decides the tier
  const seenYears = new Set<number>();
  for (const row of ordered) {
    if (seenYears.has(row.year)) continue;
    seenYears.add(row.year);
    if (await hasSponsorshipRow(tx, keeper.id, row.year)) continue;
    await tx.insert(sponsorships).values({ sponsorId: keeper.id, year: row.year, tier: row.tier });
    result.createdSponsorships++;
  }

  if (duplicateIds.length === 0) return;

  // Keep a company link a duplicate had if the kept record has none
  if (keeper.companyId == null) {
    const withCompany = duplicates.find((d) => d.companyId != null);
    if (withCompany) {
      await tx.update(sponsors).set({ companyId: withCompany.companyId }).where(eq(sponsors.id, keeper.id));
    }
  }

  // Repoint references to the duplicates
  await tx
    .update(summits)
    .set({ presentingSponsorId: keeper.id })
    .where(inArray(summits.presentingSponsorId, duplicateIds));
  const dupSponsorships = await tx
    .select()
    .from(sponsorships)
    .where(and(inArray(sponsorships.sponsorId, duplicateIds), isNull(sponsorships.deletedAt)));
  for (const s of dupSponsorships) {
    const [active] = await tx
      .select({ id: sponsorships.id })
      .from(sponsorships)
      .where(and(eq(sponsorships.sponsorId, keeper.id), eq(sponsorships.year, s.year), isNull(sponsorships.deletedAt)))
      .limit(1);
    if (active) {
      await tx.update(sponsorships).set({ deletedAt: new Date().toISOString() }).where(eq(sponsorships.id, s.id));
    } else {
      await tx.update(sponsorships).set({ sponsorId: keeper.id }).where(eq(sponsorships.id, s.id));
    }
  }

  await tx
    .update(sponsors)
    .set({ deletedAt: new Date().toISOString() })
    .where(inArray(sponsors.id, duplicateIds));
  result.mergedDuplicates += duplicateIds.length;
}

/** Converts legacy per-year sponsor rows into sponsorships. Idempotent. */
export async function migrateLegacySponsors(): Promise<SponsorshipMigrationResult> {
  const result: SponsorshipMigrationResult = {
    legacyRows: 0,
    createdSponsorships: 0,
    mergedDuplicates: 0,
  };
  await db.transaction(async (tx) => {
    const rows = await findLegacyRows(tx);
    result.legacyRows = rows.length;
    for (const group of groupRows(rows)) {
      await migrateGroup(tx, group, result);
    }
  });
  return result;
}

/**
 * Links each summit's presenting sponsor where none is linked yet and the old
 * "Presented by" text matches a sponsor with a sponsorship in that summit's year.
 * Idempotent; clearing the presenting sponsor in the admin also clears the text,
 * so a cleared summit is never relinked.
 */
export async function linkPresentingSponsors(): Promise<number> {
  const linked = await db.execute(sql`
    UPDATE summits s SET presenting_sponsor_id = (
      SELECT sp.id FROM sponsors sp
      JOIN sponsorships ss ON ss.sponsor_id = sp.id AND ss.year = s.year AND ss.deleted_at IS NULL
      WHERE sp.deleted_at IS NULL
        AND lower(trim(sp.name)) = lower(trim(s.presented_by_name))
      ORDER BY sp.id
      LIMIT 1
    )
    WHERE s.presenting_sponsor_id IS NULL
      AND coalesce(trim(s.presented_by_name), '') <> ''
      AND EXISTS (
        SELECT 1 FROM sponsors sp
        JOIN sponsorships ss ON ss.sponsor_id = sp.id AND ss.year = s.year AND ss.deleted_at IS NULL
        WHERE sp.deleted_at IS NULL
          AND lower(trim(sp.name)) = lower(trim(s.presented_by_name))
      )
    RETURNING s.id
  `);
  return linked.rows?.length ?? 0;
}
