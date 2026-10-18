import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EventEmitter } from "node:events";
import vm from "node:vm";
import ts from "typescript";
import { automaticSyncsEnabled } from "./automaticSyncPolicy";

// Load the real service code with isolated dependencies: no credentials,
// database, network, or real timers, including in the production tests.
function harness(env: Record<string, string | undefined>, lastSync: Date | null = null) {
  const calls = { reads: 0, writes: 0, stripe: 0, backfills: 0, reconciliations: 0, events: 0, cache: 0 };
  const timers: Array<{ fn: () => unknown; delay: number; kind: string }> = [];
  const logs: string[] = [];
  const timer = (kind: string) => (fn: () => unknown, delay: number) => {
    const handle = { fn, delay, kind };
    timers.push(handle);
    return handle;
  };
  const db = {
    select() {
      calls.reads++;
      return { from: () => ({ where: () => ({ limit: async () => lastSync ? [{ value: lastSync.toISOString() }] : [] }) }) };
    },
    insert() {
      calls.writes++;
      return { values: () => ({ onConflictDoUpdate: async () => {} }) };
    },
    async execute() { calls.writes++; },
  };
  const modules = new Map<string, any>();
  function load(name: string): any {
    if (modules.has(name)) return modules.get(name);
    const path = resolve(`server/services/${name}.ts`);
    const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const module = { exports: {} };
    modules.set(name, module.exports);
    vm.runInNewContext(outputText, {
      module, exports: module.exports,
      process: { env: { DATABASE_URL: "test-placeholder", ...env } },
      console: Object.fromEntries(["log", "warn", "error"].map(key => [key, (...args: unknown[]) => logs.push(args.join(" "))])),
      setTimeout: timer("timeout"), setInterval: timer("interval"),
      clearTimeout() {}, clearInterval() {},
      require(id: string) {
        if (id === "./automaticSyncPolicy") return load("automaticSyncPolicy");
        if (id === "events") return { EventEmitter };
        if (id === "../db") return { db };
        if (id === "@shared/schema") return { cacheMetadata: { key: "key" } };
        if (id === "drizzle-orm") return { eq() {}, sql() {} };
        if (id === "../stripeClient") return {
          async getStripeSecretKey() { calls.stripe++; return "test-placeholder"; },
          async getStripeSync() { calls.stripe++; return { async syncBackfill() { calls.backfills++; } }; },
        };
        if (id === "./stripeWebhookSetup") return {
          readWebhookSetupEnv() { return {}; },
          async setUpManagedWebhookForEnvironment() { return { action: "skipped", reason: "test" }; },
        };
        if (id === "./stripe") return { StripeService: { async reconcileAllSubscriptions() { calls.reconciliations++; } } };
        if (id === "../storage") return {
          setMemberStatsSyncing() {},
          storage: {
            async getLastCacheUpdate() { calls.reads++; return lastSync; },
            async getFutureEvents() { calls.events++; return []; },
            async getRecentlyEndedEvents() { calls.events++; return []; },
          },
        };
        if (id === "./SyncStatusService") return { syncStatusService: { startSync() {}, endSync() {} } };
        if (["../routes", "./LumaMembershipService", "../utils/premiumCheck", "./couponSyncService", "./lumaHelpers"].includes(id)) return {};
        throw new Error(`Unexpected dependency ${id}`);
      },
    }, { filename: path });
    return module.exports;
  }
  function cache() {
    const { CacheService } = load("CacheService");
    CacheService.prototype.updateCache = async () => { calls.cache++; };
    return CacheService.getInstance();
  }
  return { load, cache, calls, timers, logs };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test("only production or an exact explicit opt-in enables automatic syncs", () => {
  for (const NODE_ENV of [undefined, "development", "test", "staging"]) {
    for (const ENABLE_DEV_EXTERNAL_SYNCS of [undefined, "", "false", "1", "TRUE", " true "]) {
      assert.equal(automaticSyncsEnabled({ NODE_ENV, ENABLE_DEV_EXTERNAL_SYNCS }), false);
    }
    assert.equal(automaticSyncsEnabled({ NODE_ENV, ENABLE_DEV_EXTERNAL_SYNCS: "true" }), true);
  }
  assert.equal(automaticSyncsEnabled({ NODE_ENV: "production" }), true);
  assert.equal(automaticSyncsEnabled({ NODE_ENV: "production", ENABLE_DEV_EXTERNAL_SYNCS: "false" }), true);
});

for (const NODE_ENV of [undefined, "development", "test", "staging"]) {
  test(`${NODE_ENV}: repeated service startup does no work and installs no timers`, async () => {
    const h = harness({ NODE_ENV });
    for (let i = 0; i < 2; i++) {
      h.load("stripeStartupSync").startStripeBackgroundSync();
      const cache = h.cache();
      assert.equal(cache.nextSyncAt, null);
      const events = await h.load("eventSyncService").startEventSyncService(true);
      assert.equal(events.recentSyncInterval, null);
      assert.equal(events.futureSyncInterval, null);
    }
    await settle();
    assert.ok(Object.values(h.calls).every(count => count === 0));
    assert.equal(h.timers.length, 0);
    for (const name of ["Stripe", "CacheService", "EventSync"]) {
      assert.ok(h.logs.some(line => line.includes(`[${name}] Automatic sync disabled`)));
    }
  });
}

for (const env of [
  { NODE_ENV: "production", ENABLE_DEV_EXTERNAL_SYNCS: "false" },
  { NODE_ENV: "development", ENABLE_DEV_EXTERNAL_SYNCS: "true" },
]) {
  test(`${env.NODE_ENV}: startup and recurring schedules still run when enabled`, async () => {
    const h = harness(env);
    h.load("stripeStartupSync").startStripeBackgroundSync();
    h.cache();
    await h.load("eventSyncService").startEventSyncService();
    await settle();
    assert.equal(h.calls.backfills, 1);
    assert.equal(h.calls.reconciliations, 1);
    assert.equal(h.calls.events, 1);
    const initialCache = h.timers.find(t => t.kind === "timeout")!;
    assert.equal(initialCache.delay, 30_000);
    await initialCache.fn();
    assert.equal(h.calls.cache, 1);
    const intervals = h.timers.filter(t => t.kind === "interval");
    assert.deepEqual(intervals.map(t => t.delay).sort(), [3_600_000, 3_600_000, 21_600_000, 21_600_000].sort());
    for (const t of intervals) await t.fn();
    await settle();
    assert.equal(h.calls.backfills, 2);
    assert.equal(h.calls.reconciliations, 2);
    assert.equal(h.calls.events, 3);
    assert.equal(h.calls.cache, 2);
    if (env.NODE_ENV !== "production") assert.ok(h.logs.some(line => line.includes("not a dry run")));
  });

  test(`${env.NODE_ENV}: freshness checks still postpone Stripe and Luma syncs`, async () => {
    const h = harness(env, new Date());
    h.load("stripeStartupSync").startStripeBackgroundSync();
    h.cache();
    await settle();
    assert.equal(h.calls.backfills, 0);
    assert.equal(h.calls.reconciliations, 0);
    assert.equal(h.calls.cache, 0);
    assert.ok(h.timers.some(t => t.kind === "timeout" && t.delay > 21_500_000));
    assert.ok(h.logs.some(line => line.includes("Skipping startup backfill")));
    assert.ok(h.logs.some(line => line.includes("Skipping startup Luma sync")));
  });
}

test("a manual development cache refresh does not enable recurring sync", async () => {
  const h = harness({ NODE_ENV: "development" });
  const cache = h.cache();
  assert.equal(await cache.forceSync(), true);
  assert.equal(h.calls.cache, 1);
  assert.equal(h.timers.length, 0);
  assert.equal(cache.nextSyncAt, null);
});
