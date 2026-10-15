import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

// Exercise storage's actual filters/SQL without loading a database or background services.
const bundle = await build({
  entryPoints: ["server/storage.ts"],
  bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
  plugins: [{
    name: "read-only-display-db",
    setup(builder) {
      builder.onResolve({ filter: /^\.\/db$/ }, () => ({ path: "db", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: "export const db = fixtureDb;", loader: "js",
      }));
    },
  }],
});

const sponsorRows = [
  { id: 1, name: "Returning", companyId: 10, deletedAt: null },
  { id: 2, name: "Early Next Year", companyId: 20, deletedAt: null },
  { id: 3, name: "Unlinked", companyId: null, deletedAt: null },
  { id: 4, name: "Same Company", companyId: 10, deletedAt: null },
  { id: 5, name: "Removed Sponsor", companyId: 30, deletedAt: "2026-01-01" },
];
const sponsorshipRows = [
  { id: 101, sponsorId: 1, year: 2026, tier: "Seed", deletedAt: null },
  { id: 102, sponsorId: 3, year: 2026, tier: "Angel", deletedAt: null },
  { id: 103, sponsorId: 4, year: 2026, tier: "Seed", deletedAt: null },
  { id: 104, sponsorId: 5, year: 2026, tier: "Seed", deletedAt: null },
  { id: 105, sponsorId: 2, year: 2026, tier: "Seed", deletedAt: "2026-01-01" },
  { id: 201, sponsorId: 1, year: 2027, tier: "Angel", deletedAt: null },
  { id: 202, sponsorId: 2, year: 2027, tier: "Series A", deletedAt: null },
];
const summitRows = [
  { id: 1, year: 2026, isCurrent: false, isPublished: true, presentingSponsorId: null },
  { id: 2, year: 2027, isCurrent: true, isPublished: true, presentingSponsorId: null },
];

function fixture(date = "2026-10-15T00:00:00Z", summits = summitRows) {
  const queries: any[] = [];
  const dialect = new PgDialect();
  const compile = (value: any) => value ? dialect.sqlToQuery(value) : { sql: "", params: [] };
  function resolve(query: any) {
    queries.push(query);
    const where = compile(query.condition);
    const conditions = [where, ...query.joins.map((j: any) => compile(j.condition))];
    const year = conditions.flatMap(c => c.params).find((p: any) => typeof p === "number" && p >= 2000);
    if (query.table === "summits") return summits.filter(s => s.isCurrent);
    if (query.table === "sponsors") return sponsorRows.filter(s => !s.deletedAt);
    if (query.table === "companies") return [
      { id: 10, name: "Company", industry: "Technology" },
      { id: 20, name: "Other Company", industry: "Other" },
    ];
    assert.equal(query.table, "sponsorships");
    if (query.joins.length === 0) return sponsorshipRows.filter(s => !s.deletedAt);
    let rows = sponsorshipRows.filter(s => !s.deletedAt && (year === undefined || s.year === year)).flatMap(sp => {
      const sponsor = sponsorRows.find(s => s.id === sp.sponsorId && !s.deletedAt);
      return sponsor ? [{ ...sponsor, year: sp.year, tier: sp.tier, sponsorshipId: sp.id }] : [];
    });
    if (where.sql.includes('"sponsors"."id" =')) rows = rows.filter(s => s.id === where.params[0]);
    const distinctCompanies = (values: typeof rows) => new Set(values.filter(s => s.companyId !== null).map(s => s.companyId)).size;
    if (query.selection?.count) {
      assert.match(where.sql, /"sponsorships"\."year"/);
      assert.match(where.sql, /"sponsors"\."deleted_at" is null/);
      assert.match(where.sql, /"sponsorships"\."deleted_at" is null/);
      const countSql = compile(query.selection.count);
      assert.match(countSql.sql, /COUNT\(DISTINCT "sponsors"\."company_id"\)/);
      return query.selection.tier
        ? [...new Set(rows.map(s => s.tier))].map(tier => ({ tier, count: distinctCompanies(rows.filter(s => s.tier === tier)) }))
        : [{ count: distinctCompanies(rows) }];
    }
    assert.match(where.sql, /"sponsorships"\."year"/);
    return rows;
  }
  const fixtureDb = {
    select(selection: any) {
      const query: any = { selection, joins: [] };
      const chain: any = {
        from(table: any) { query.table = getTableName(table); return chain; },
        where(condition: any) { query.condition = condition; return chain; },
        innerJoin(table: any, condition: any) { query.joins.push({ table: getTableName(table), condition }); return chain; },
        orderBy() { return chain; }, groupBy() { return chain; }, limit() { return chain; },
        then(onSuccess: any, onError: any) { return Promise.resolve().then(() => resolve(query)).then(onSuccess, onError); },
      };
      return chain;
    },
    update() { throw new Error("Display reads must not update data"); },
    insert() { throw new Error("Display reads must not insert data"); },
    delete() { throw new Error("Display reads must not delete data"); },
  };
  class Clock extends Date {
    constructor() { super(date); }
  }
  const loaded = { exports: {} as any };
  new Function("require", "module", "exports", "fixtureDb", "Date", bundle.outputFiles[0].text)(
    createRequire(import.meta.url), loaded, loaded.exports, fixtureDb, Clock,
  );
  return { storage: new loaded.exports.PostgresStorage(), queries };
}

test("general sponsor active status follows calendar year, not the featured 2027 summit", async () => {
  for (const [date, activeIds] of [
    ["2027-01-01T04:59:59Z", [1, 3, 4]],
    ["2027-01-01T05:00:00Z", [1, 2]],
  ] as const) {
    const { storage, queries } = fixture(date);
    const rows = await storage.getAllSponsorsWithHistory();
    assert.deepEqual(rows.filter((s: any) => s.isActive).map((s: any) => s.id), activeIds);
    assert.equal(queries.some(q => q.table === "summits"), false);
    // History is retained; current-year status never drops the other year's records.
    assert.equal(rows.find((s: any) => s.id === 1).sponsorships.length, 2);
  }
});

test("individual sponsor display queries use the requested year's sponsorship and tier", async () => {
  const { storage } = fixture();
  assert.equal((await storage.getYearSponsor(1, 2026)).tier, "Seed");
  assert.equal((await storage.getYearSponsor(1, 2027)).tier, "Angel");
  assert.equal(await storage.getYearSponsor(2, 2026), null);
  assert.equal(await storage.getYearSponsor(5, 2026), null);
});

test("company-list defaults and explicit count scopes preserve distinct company-linked counting", async () => {
  const { storage, queries } = fixture();
  for (const filter of [undefined, "Technology"]) {
    for (const year of [undefined, 2026, 2027]) {
      const result = await storage.getFilteredCompanies(filter, year);
      assert.equal(result.filters.sponsors.count, year === 2027 ? 2 : 1);
      assert.deepEqual(result.filters.sponsors.tiers, year === 2027
        ? [{ name: "Series A", count: 1 }, { name: "Angel", count: 1 }]
        : [{ name: "Seed", count: 1 }]);
    }
  }
  assert.equal(queries.some(q => q.table === "summits"), false);
});

test("publishing alone never implicitly features a summit; explicit flags select promotion only", async () => {
  const none = fixture(undefined, summitRows.map(s => ({ ...s, isCurrent: false })));
  assert.equal(await none.storage.getCurrentSummit(), null);
  const featured = fixture();
  assert.equal((await featured.storage.getCurrentSummit()).year, 2027);
  const draft = fixture(undefined, summitRows.map(s => ({ ...s, isPublished: s.year !== 2027 })));
  assert.equal(await draft.storage.getCurrentSummit(), null);
  assert.equal((await draft.storage.getCurrentSummit({ includeUnpublished: true })).year, 2027);
});
