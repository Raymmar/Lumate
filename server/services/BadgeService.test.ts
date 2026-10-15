import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { userBadges } from "../../shared/schema";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Replace only the DB module; exercise the real service without touching live data.
const bundle = await build({
  entryPoints: ["server/services/BadgeService.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  write: false,
  plugins: [{
    name: "test-db",
    setup(builder) {
      builder.onResolve({ filter: /^\.\.\/db$/ }, () => ({ path: "db", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: "export const db = testDb;",
        loader: "js",
      }));
    },
  }],
});

function createService(db: unknown) {
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "testDb", bundle.outputFiles[0].text)(
    createRequire(import.meta.url), module, module.exports, db,
  );
  return module.exports.badgeService;
}

function fixture(value?: string, options: { readError?: boolean; usersError?: boolean; writeError?: boolean } = {}) {
  const writes: any[] = [];
  let userReads = 0;
  const db = {
    select: () => ({
      from: () => ({
        // Startup metadata reads use where/limit; daily user reads await from.
          then: (resolve: any, reject: any) => Promise.resolve().then(() => {
            userReads++;
            if (options.usersError) throw new Error("users unavailable");
            return [
              { id: 1, email: "badge@example.test" },
              { id: 2, email: "second@example.test" },
            ];
          }).then(resolve, reject),
          where: () => ({
            limit: async () => {
              if (options.readError) throw new Error("metadata unavailable");
              return value === undefined ? [] : [{ value }];
            },
          }),
      }),
    }),
    insert: () => ({
      values: (row: any) => ({
        onConflictDoUpdate: async () => {
          if (options.writeError) throw new Error("metadata write failed");
          writes.push(row);
        },
      }),
    }),
  };
  const service = createService(db);
  service.processUserBadges = async () => {};
  return { service, writes, userReads: () => userReads };
}

test("startup skips a successful pass under 24h old with one clear log", async () => {
  const { service, writes, userReads } = fixture(new Date().toISOString());
  const messages: string[] = [];
  const original = console.log;
  console.log = message => messages.push(message);
  try {
    await service.runStartupBadgeAssignment();
  } finally {
    console.log = original;
  }
  assert.equal(userReads(), 0);
  assert.equal(writes.length, 0);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Skipping startup badge assignment/);
});

for (const [label, value] of [
  ["missing", undefined],
  ["expired", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()],
  ["invalid", "not a timestamp"],
  ["future", new Date(Date.now() + 60_000).toISOString()],
] as const) {
  test(`startup runs for a ${label} timestamp and persists successful completion`, async () => {
    const { service, writes, userReads } = fixture(value);
    await service.runStartupBadgeAssignment();
    assert.equal(userReads(), 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].key, "last_badge_assignment");
    assert.ok(Number.isFinite(Date.parse(writes[0].value)));
  });
}

test("metadata read failure still runs the badge pass", async () => {
  const { service, writes } = fixture(undefined, { readError: true });
  await service.runStartupBadgeAssignment();
  assert.equal(writes.length, 1);
});

test("a failed user does not record success and other users are still processed", async () => {
  const { service, writes } = fixture();
  const processed: number[] = [];
  service.processUserBadges = async (user: { id: number }) => {
    processed.push(user.id);
    if (user.id === 1) throw new Error("assignment failed");
  };
  assert.equal(await service.runDailyBadgeAssignment(), false);
  assert.deepEqual(processed, [1, 2]);
  assert.equal(writes.length, 0);
});

test("a failed user query does not record success", async () => {
  const { service, writes } = fixture(undefined, { usersError: true });
  await assert.rejects(service.runDailyBadgeAssignment(), /users unavailable/);
  assert.equal(writes.length, 0);
});

test("scheduled and manual passes still run even with a recent timestamp", async () => {
  const { service, writes, userReads } = fixture(new Date().toISOString());
  assert.equal(await service.runDailyBadgeAssignment(), true);
  assert.equal(userReads(), 1);
  assert.equal(writes.length, 1);
});

test("a timestamp write failure is surfaced rather than reported as success", async () => {
  const { service } = fixture(undefined, { writeError: true });
  await assert.rejects(service.runDailyBadgeAssignment(), /metadata write failed/);
});

test("awards have a unique database index on the user/badge pair", () => {
  const index = getTableConfig(userBadges).indexes.find(
    index => index.config.name === "user_badges_user_badge_unique",
  );
  assert.ok(index?.config.unique);
  assert.deepEqual(index.config.columns.map(column => "name" in column ? column.name : null), [
    "user_id", "badge_id",
  ]);
});

// Each pass reads the same empty snapshot before either can insert.
// Separate service instances model independent workers, not an in-process lock.
function overlappingFixture(options: { insertError?: boolean; expiredMetadata?: boolean } = {}) {
  const user = { id: 1, email: "badge@example.test", subscriptionStatus: "active" };
  const catalog = Array.from({ length: 9 }, (_, i) => ({ id: i + 1, name: `Badge ${i + 1}` }));
  const rules = [
    { badgeId: 1, ruleType: "event_attendance", config: { eventApiId: "event-1" } },
    { badgeId: 2, ruleType: "premium_member", config: {} },
    { badgeId: 3, ruleType: "event_count_min", config: { minEvents: 1 } },
    { badgeId: 4, ruleType: "event_count_max", config: { maxEvents: 2 } },
    { badgeId: 5, ruleType: "manual_only", config: {} },
    { badgeId: 6, ruleType: "event_count_min", config: { minEvents: 5 } },
    // Badge 7 has no rules. Badge 8 uses OR, with manual_only ignored.
    { badgeId: 8, ruleType: "manual_only", config: {} },
    { badgeId: 8, ruleType: "event_attendance", config: { eventApiId: "missing" } },
    { badgeId: 8, ruleType: "premium_member", config: {} },
    { badgeId: 9, ruleType: "unknown", config: {} },
  ];
  const awards = new Map<number, any>();
  const completions: any[] = [];
  let reads = 0;
  let attempts = 0;
  let release!: () => void;
  const bothRead = new Promise<void>(resolve => { release = resolve; });
  const db = {
    select: () => ({
      from: (table: any) => {
        const name = getTableName(table);
        const read = async () => {
          if (name === "users") return [user];
          if (name === "attendance") return [{ eventApiId: "event-1" }];
          if (name === "badges") return catalog;
          if (name === "badge_rules") return rules;
          if (name === "cache_metadata") return [{
            value: new Date(Date.now() - (options.expiredMetadata ? 25 * 60 * 60 * 1000 : 0)).toISOString(),
          }];
          assert.equal(name, "user_badges");
          const snapshot = [...awards.values()];
          if (++reads === 2) release();
          await bothRead;
          return snapshot;
        };
        const result = {
          then: (resolve: any, reject: any) => read().then(resolve, reject),
          limit: () => read(),
        };
        return { ...result, where: () => result };
      },
    }),
    insert: (table: any) => ({
      values: (row: any) => ({
        onConflictDoUpdate: async () => {
          assert.equal(getTableName(table), "cache_metadata");
          completions.push(row);
        },
        onConflictDoNothing: ({ target }: any) => {
          assert.equal(getTableName(table), "user_badges");
          assert.deepEqual(target.map((column: any) => column.name), ["user_id", "badge_id"]);
          return {
            returning: async () => {
              attempts++;
              if (options.insertError) throw new Error("database unavailable");
              if (awards.has(row.badgeId)) return [];
              const award = { id: awards.size + 1, ...row };
              awards.set(row.badgeId, award);
              return [award];
            },
          };
        },
      }),
    }),
  };
  return {
    manual: createService(db), background: createService(db), user, awards, completions,
    attempts: () => attempts,
  };
}

test("overlapping forced admin and daily passes award once without spurious failures", async () => {
  const { manual, background, awards, completions, attempts } = overlappingFixture();
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args) => { errors.push(args); };
  try {
    assert.deepEqual(await Promise.all([
      manual.runDailyBadgeAssignment(), background.runDailyBadgeAssignment(),
    ]), [true, true]);
    assert.deepEqual([...awards.keys()].sort(), [1, 2, 3, 4, 8]);
    assert.equal(attempts(), 10, "both passes must actually try to award each eligible badge");
    assert.equal(completions.length, 2, "neither pass treats duplicate suppression as failure");
    assert.deepEqual(errors, []);
    assert.equal(await manual.runDailyBadgeAssignment(), true, "a later forced pass still runs");
    assert.equal(completions.length, 3);
    assert.equal(attempts(), 10, "existing awards are still skipped");
  } finally {
    console.error = original;
  }
});

test("an expired startup pass can overlap a forced pass safely", async () => {
  const { manual, background, awards, completions } = overlappingFixture({ expiredMetadata: true });
  await Promise.all([background.runStartupBadgeAssignment(), manual.runDailyBadgeAssignment()]);
  assert.equal(awards.size, 5);
  assert.equal(completions.length, 2);
});

test("per-user assignment can overlap a full pass without duplicate awards", async () => {
  const { manual, background, user, awards, completions } = overlappingFixture();
  await Promise.all([manual.processUserBadges(user), background.runDailyBadgeAssignment()]);
  assert.equal(awards.size, 5);
  assert.equal(completions.length, 1);
});

test("real insert failures are not hidden as duplicate conflicts", async () => {
  const { manual, background, completions } = overlappingFixture({ insertError: true });
  assert.deepEqual(await Promise.all([
    manual.runDailyBadgeAssignment(), background.runDailyBadgeAssignment(),
  ]), [false, false]);
  assert.equal(completions.length, 0);
});

test("PostgreSQL migration preserves original awards and concurrent inserts are idempotent", {
  // Point this only at a disposable local test database, never application data.
  skip: !process.env.BADGE_TEST_DATABASE_URL,
}, async () => {
  const url = new URL(process.env.BADGE_TEST_DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  const schema = `badge_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: url.toString() });
  const pool = new pg.Pool({
    connectionString: url.toString(), options: `-c search_path=${schema}`, max: 10,
  });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await pool.query(`
      CREATE TABLE users (id integer PRIMARY KEY);
      CREATE TABLE badges (id integer PRIMARY KEY);
      INSERT INTO users VALUES (1), (2);
      INSERT INTO badges VALUES (1), (2);
      CREATE TABLE user_badges (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id),
        badge_id integer NOT NULL REFERENCES badges(id),
        assigned_by integer REFERENCES users(id),
        assigned_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO user_badges (user_id, badge_id, assigned_by, assigned_at) VALUES
        (1, 1, NULL, '2026-02-01'),
        (1, 1, 2, '2026-01-01'),
        (1, 1, NULL, '2026-01-01'),
        (2, 1, NULL, '2026-03-01');
    `);
    const migration = await readFile("server/migrations/user-badges-unique.sql", "utf8");
    await pool.query(migration);
    await pool.query(migration); // Safe to reapply during post-merge setup.
    const retained = await pool.query("SELECT id, user_id, assigned_by FROM user_badges ORDER BY id");
    assert.deepEqual(retained.rows, [
      { id: 2, user_id: 1, assigned_by: 2 },
      { id: 4, user_id: 2, assigned_by: null },
    ]);
    const manual = createService(drizzle(pool));
    const background = createService(drizzle(pool));
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) =>
      (i % 2 ? manual : background).assignBadge(1, 2),
    ));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM user_badges")).rows[0].count, 3);
    assert.equal(await manual.assignBadge(1, 1), undefined);
    const original = await pool.query("SELECT id, assigned_by FROM user_badges WHERE user_id = 1 AND badge_id = 1");
    assert.deepEqual(original.rows, [{ id: 2, assigned_by: 2 }]);
    await assert.rejects(manual.assignBadge(999, 2), /foreign key constraint/);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
