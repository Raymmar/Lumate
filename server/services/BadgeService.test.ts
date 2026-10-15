import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";

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
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "testDb", bundle.outputFiles[0].text)(
    createRequire(import.meta.url), module, module.exports, db,
  );
  const service = module.exports.badgeService;
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
