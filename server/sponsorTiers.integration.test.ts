import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { eq } from "drizzle-orm";
import { companies, sponsors, sponsorships, sponsorTiers, users } from "../shared/schema";
import { getAnnualSponsorYear } from "../shared/sponsorYear";

// Opt-in, development only. All fixtures and initialization are rolled back.
// Exercises actual Postgres ordering/deduplication instead of simulating its results.
test("catalog initialization, annual assignment, directory ranking and company links", {
  skip: process.env.RUN_SPONSOR_DB_TESTS !== "true" || process.env.NODE_ENV === "production",
}, async () => {
  const { db, pool } = await import("./db");
  const bundle = await build({
    stdin: {
      contents: `
        export * from "./server/services/sponsorTiers";
        export { PostgresStorage } from "./server/storage";
        export { hasCompanyPremiumAccess } from "./server/utils/premiumCheck";
        export { requireAdmin } from "./server/routes/middleware";
      `,
      resolveDir: process.cwd(),
    },
    bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
    plugins: [{
      name: "transaction-scoped-db",
      setup(builder) {
        builder.onResolve({ filter: /^\.\.?\/db$/ }, () => ({ path: "db", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: "export const db = fixtureDb;", loader: "js",
        }));
      },
    }],
  });
  const rollback = new Error("rollback successful test fixtures");
  try {
    await db.transaction(async tx => {
      const loaded = { exports: {} as any };
      new Function("require", "module", "exports", "fixtureDb", bundle.outputFiles[0].text)(
        createRequire(import.meta.url), loaded, loaded.exports, tx,
      );
      const api = loaded.exports;
      const storage = new api.PostgresStorage();
      // Same middleware used by the new write endpoint; no sessions or auth bypass in the app.
      const [member] = await tx.insert(users).values({ email: `tier-fixture-${Date.now()}@example.invalid` }).returning();
      for (const [session, expected] of [[{}, 401], [{ userId: member.id }, 403]] as const) {
        let status: number | undefined;
        const response = { status(value: number) { status = value; return response; }, json() {} };
        await api.requireAdmin({ session }, response, () => assert.fail("Non-admin tier write allowed"));
        assert.equal(status, expected);
      }
      const year = getAnnualSponsorYear();
      const [companyA, companyB] = await tx.insert(companies).values([
        { name: "ZZ Tier fixture A", description: "Untouched company profile" },
        { name: "AA Tier fixture B", description: "Other profile" },
      ]).returning();
      const [returning, duplicateLink, other, firstTime] = await tx.insert(sponsors).values([
        { name: "Returning tier fixture", logo: "/st-logo-email.png", companyId: companyA.id, tier: "Historical fixture", year: year - 1 },
        { name: "Shared company fixture", logo: "/st-logo-email.png", companyId: companyA.id },
        { name: "Other company fixture", logo: "/st-logo-email.png", companyId: companyB.id },
        { name: "First time fixture", logo: "/st-logo-email.png" },
      ]).returning();
      await tx.insert(sponsorships).values({
        sponsorId: returning.id, year: year - 1, tier: "Historical fixture",
      });
      await api.initializeSponsorTiers();
      const seeded = await api.getSponsorTiers();
      const originalDefault = seeded.find((t: any) => t.isDefault);
      assert.equal(originalDefault.key, "Series A");
      assert.equal(seeded.find((t: any) => t.key === "Historical fixture").presentation, "standard");
      const tier = await api.createSponsorTier(api.createSponsorTierSchema.parse({
        name: "Priority fixture", description: "New reusable classification", position: -1000, presentation: "pair",
      }));
      assert.notEqual(tier.key, tier.name);
      await assert.rejects(() => api.createSponsorTier(api.createSponsorTierSchema.parse({
        name: "  priority   fixture ", position: 0, presentation: "standard",
      })), /already exists/);
      assert.equal(api.createSponsorTierSchema.safeParse({ name: "x", position: 1.2, presentation: "invalid" }).success, false);
      // Rerun must not overwrite custom metadata, default, global records or annual history.
      await tx.update(sponsorTiers).set({ description: "Keep configured metadata" }).where(eq(sponsorTiers.key, originalDefault.key));
      const beforeTiers = await api.getSponsorTiers();
      const beforeSponsors = await tx.select().from(sponsors);
      const beforeAnnual = await tx.select().from(sponsorships);
      await api.initializeSponsorTiers();
      assert.deepEqual(await api.getSponsorTiers(), beforeTiers);
      assert.deepEqual(await tx.select().from(sponsors), beforeSponsors);
      assert.deepEqual(await tx.select().from(sponsorships), beforeAnnual);
      assert.equal(await api.resolveAssignmentTier(), originalDefault.key);
      await assert.rejects(() => api.resolveAssignmentTier("Not configured"), /configured/);
      const added = await storage.addSponsorship({ sponsorId: returning.id, year, tier: tier.key });
      assert.equal(added.tier, tier.key);
      assert.equal(await storage.addSponsorship({ sponsorId: returning.id, year, tier: tier.key }), null);
      await assert.rejects(() => storage.addSponsorship({ sponsorId: other.id, year, tier: "Not configured" }), /configured/);
      await assert.rejects(() => storage.updateSponsorshipTier(added.id, "Not configured"), /configured/);
      assert.equal((await storage.ensureSponsorship(firstTime.id, year)).tier, originalDefault.key);
      assert.equal((await storage.ensureSponsorship(returning.id, year + 1)).tier, tier.key);
      await storage.addSponsorship({ sponsorId: duplicateLink.id, year, tier: originalDefault.key });
      await storage.addSponsorship({ sponsorId: other.id, year, tier: originalDefault.key });
      const directory = await storage.getFilteredCompanies("sponsors", year);
      const ids = directory.companies.map((c: any) => c.id);
      assert.ok(ids.indexOf(companyA.id) < ids.indexOf(companyB.id), "actual query ranks new tier ahead of alphabetic name order");
      assert.equal(ids.filter((id: number) => id === companyA.id).length, 1);
      assert.equal(directory.filters.sponsors.count, ids.length);
      assert.equal(directory.filters.sponsors.tiers[0].name, tier.key);
      assert.equal(directory.filters.sponsors.tiers[0].count, 1);
      assert.equal((await storage.getSponsors(year)).find((s: any) => s.id === returning.id).tier, tier.key);
      assert.equal((await storage.getYearSponsor(returning.id, year - 1)).tier, "Historical fixture");
      // Global option edits alter ranking/presentation, never identities or participation.
      for (const locked of [{ name: "Renamed" }, { key: "new-key" }, { isDefault: true }, {}]) {
        assert.equal(api.updateSponsorTierSchema.safeParse(locked).success, false);
      }
      assert.equal(api.updateSponsorTierSchema.safeParse({ position: 1.5 }).success, false);
      assert.equal(api.updateSponsorTierSchema.safeParse({ presentation: "invalid" }).success, false);
      const assignmentsBeforeEdit = await tx.select().from(sponsorships);
      const identitiesBeforeEdit = await tx.select().from(sponsors);
      const edited = await api.updateSponsorTier(tier.key, {
        position: 1500, presentation: "compact", description: "Updated across every year",
      });
      assert.equal(edited.name, tier.name);
      assert.equal(edited.key, tier.key);
      assert.equal(edited.isDefault, false);
      const reordered = await storage.getFilteredCompanies("sponsors", year);
      const reorderedIds = reordered.companies.map((c: any) => c.id);
      assert.ok(reorderedIds.indexOf(companyB.id) < reorderedIds.indexOf(companyA.id));
      assert.equal(reordered.filters.sponsors.tiers.find((t: any) => t.name === tier.key).count, 1);
      const oldTier = await api.updateSponsorTier("501c3/.edu", { description: null, presentation: "standard" });
      assert.equal(oldTier.key, "501c3/.edu");
      assert.equal(oldTier.name, "501c3/.edu");
      assert.equal(oldTier.description, null);
      assert.equal(await api.updateSponsorTier("nonexistent fixture", { position: 1 }), null);
      await api.initializeSponsorTiers();
      assert.deepEqual((await api.getSponsorTiers()).find((t: any) => t.key === tier.key), edited);
      assert.deepEqual((await api.getSponsorTiers()).find((t: any) => t.key === oldTier.key), oldTier);
      assert.equal(await api.resolveAssignmentTier(), originalDefault.key);
      assert.deepEqual(await tx.select().from(sponsorships), assignmentsBeforeEdit);
      assert.deepEqual(await tx.select().from(sponsors), identitiesBeforeEdit);
      await storage.updateSponsorshipTier(added.id, originalDefault.key);
      assert.equal((await storage.getYearSponsor(returning.id, year + 1)).tier, tier.key);
      assert.equal((await api.hasCompanyPremiumAccess(companyA.id)).hasAccess, true);
      await storage.updateSponsor(returning.id, { companyId: null });
      assert.equal((await storage.getSponsorById(returning.id)).companyId, null);
      await storage.updateSponsor(returning.id, { companyId: companyB.id });
      assert.equal((await storage.getSponsorById(returning.id)).companyId, companyB.id);
      assert.equal((await api.hasCompanyPremiumAccess(companyB.id)).hasAccess, true);
      assert.deepEqual(await tx.select().from(companies).where(eq(companies.id, companyA.id)), [companyA]);
      assert.deepEqual(await tx.select().from(companies).where(eq(companies.id, companyB.id)), [companyB]);
      // A sponsor created inside a Summit draft must remain unassigned on cancel.
      const [draftCompany] = await tx.insert(companies).values({ name: "Draft presenter company" }).returning();
      const draftPresenter = await storage.createSponsor({
        name: "Draft presenter", logo: "/st-logo-email.png", companyId: draftCompany.id,
      });
      assert.deepEqual(await tx.select().from(sponsorships).where(eq(sponsorships.sponsorId, draftPresenter.id)), []);
      assert.equal((await api.hasCompanyPremiumAccess(draftCompany.id)).hasAccess, false);
      // If the year changes before save, only the final year's participation is added.
      const savedParticipation = await storage.ensureSponsorship(draftPresenter.id, year + 1);
      assert.equal(savedParticipation.year, year + 1);
      assert.equal(savedParticipation.tier, originalDefault.key);
      assert.equal(await storage.getYearSponsor(draftPresenter.id, year), null);
      assert.equal((await storage.getYearSponsor(draftPresenter.id, year + 1)).id, draftPresenter.id);
      assert.equal((await api.hasCompanyPremiumAccess(draftCompany.id)).hasAccess, true);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await pool.end();
  }
});
