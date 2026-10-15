import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { couponSideEffectsEnabled, COUPONS_DISABLED_MESSAGE } from "./couponSideEffects";

const require = createRequire(import.meta.url);

/**
 * Execute the real service/route bodies with isolated environment and dependency stubs.
 * No real database, SendGrid, Stripe, or Luma modules are imported by the sandbox.
 */
function harness(env: Record<string, string> = {}) {
  const calls = { reads: 0, locks: 0, luma: 0, writes: 0, emails: 0 };
  const saved: any[] = [];
  const rule = { eventApiId: "event-test", discountType: "percent", discountPercent: 100 };
  const event = { api_id: "event-test", title: "Summit", url: "https://example.test/summit" };
  const spec = { eventApiId: event.api_id, eventTitle: event.title, eventUrl: event.url };
  const recipient = { email: "member@example.test", userId: 1, personId: null, codeId: 1 };
  const handlers = new Map<string, Function>();
  const router: Record<string, Function> = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    router[method] = (path: string, ...fns: Function[]) => handlers.set(`${method} ${path}`, fns.at(-1)!);
  }
  const storage = {
    getActiveAutoCouponEvents: async () => { calls.reads++; return [rule]; },
    getPersonByEmail: async () => { calls.reads++; return null; },
    getAutoCouponEventByEventApiId: async () => { calls.reads++; return { ...rule, id: 1 }; },
    updateAutoCouponEvent: async (_id: number, fields: object) => { calls.writes++; return fields; },
    createCoupon: async (fields: any) => {
      calls.writes++;
      const coupon = { id: 1, ...fields };
      saved.push(coupon);
      return coupon;
    },
    getActivePremiumMembers: async () => { calls.reads++; return []; },
    getCoupons: async () => { calls.reads++; return saved; },
  };
  const db = {
    select: () => {
      calls.reads++;
      let table: any;
      const query = {
        from(t: any) { table = t; return query; },
        where() { return query; },
        limit: async () => table === schema.events ? [event] : saved,
      };
      return query;
    },
  };
  const schema = { coupons: { recipientEmail: {}, eventApiId: {}, recipientUserId: {} }, events: { api_id: {} }, people: {} };
  const stubs: Record<string, any> = {
    "../storage": { storage },
    "../db": { db, pool: { connect: async () => {
      calls.locks++;
      return { query: async () => {}, release() {} };
    } } },
    "@shared/schema": schema,
    "drizzle-orm": { and() {}, eq() {}, or() {}, sql() {} },
    "./lumaHelpers": { lumaApiRequest: async () => { calls.luma++; return { coupon: { api_id: "luma-test" } }; } },
    "./couponSyncService": { fetchAllLumaCouponsForEvent: async () => { calls.luma++; return []; } },
    "../email": { sendCouponNotificationEmail: async () => { calls.emails++; return true; } },
    "./db": { db },
    "./blockedEmails": { isBlockedEmail: async () => false },
    "@sendgrid/mail": { MailService: class {
      setApiKey() {}
      async send() { calls.emails++; return []; }
    } },
    "crypto": require("node:crypto"),
    "express": { Router: () => router },
    "./middleware": { requireAdmin() {}, requireAuth() {} },
    "../routes": { lumaApiRequest: async () => { calls.luma++; return {}; } },
    "zod": require("zod"),
  };
  const cache = new Map<string, any>();
  function load(relativePath: string): any {
    const path = resolve(relativePath);
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    cache.set(path, module.exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    runInNewContext(code, {
      module, exports: module.exports,
      process: { env: { SENDGRID_FROM_EMAIL: "sender@example.test", ...env } },
      console: { log() {}, error() {} }, setTimeout,
      require(id: string) {
        if (id in stubs) return stubs[id];
        if (["./couponSideEffects", "../services/couponSideEffects", "./services/couponSideEffects",
          "./memberCoupons", "../services/memberCoupons", "./couponRules"].includes(id)) {
          return load(resolve(dirname(path), `${id}.ts`));
        }
        throw new Error(`Unexpected test dependency: ${id}`);
      },
    }, { filename: path });
    return module.exports;
  }
  return { load, calls, saved, spec, recipient, rule, event, handlers };
}

test("only production or an exact explicit opt-in allows coupon side effects", () => {
  for (const NODE_ENV of [undefined, "development", "test", "staging"]) {
    for (const ENABLE_DEV_COUPONS of [undefined, "", "false", "1", "TRUE"]) {
      assert.equal(couponSideEffectsEnabled({ NODE_ENV, ENABLE_DEV_COUPONS }), false);
    }
    assert.equal(couponSideEffectsEnabled({ NODE_ENV, ENABLE_DEV_COUPONS: "true" }), true);
  }
  assert.equal(couponSideEffectsEnabled({ NODE_ENV: "production" }), true);
  assert.equal(couponSideEffectsEnabled({ NODE_ENV: "production", ENABLE_DEV_COUPONS: "false" }), true);
});

test("repeated development reconciliation calls do not even query coupon rules", async () => {
  const h = harness({ NODE_ENV: "development" });
  const { AutoCouponService } = h.load("server/services/autoCoupon.ts");
  for (let i = 0; i < 3; i++) {
    const result = await AutoCouponService.generateCouponsForNewSubscriber(1, h.recipient.email);
    assert.equal(result.couponsCreated, 0);
    assert.equal(result.errors.length, 0);
  }
  assert.deepEqual(h.calls, { reads: 0, locks: 0, luma: 0, writes: 0, emails: 0 });
});

test("direct issuance and backfill including Luma repair fail before any work in development", async () => {
  const h = harness({ NODE_ENV: "development" });
  const service = h.load("server/services/memberCoupons.ts");
  await assert.rejects(service.issueMemberCoupon(h.spec, h.recipient), { message: COUPONS_DISABLED_MESSAGE });
  await assert.rejects(service.runRuleBackfill(h.rule, h.event, 9), { message: COUPONS_DISABLED_MESSAGE });
  assert.deepEqual(h.calls, { reads: 0, locks: 0, luma: 0, writes: 0, emails: 0 });
});

for (const env of [{ NODE_ENV: "production" }, { NODE_ENV: "development", ENABLE_DEV_COUPONS: "true" }]) {
  test(`${env.NODE_ENV}: automatic issuance creates and emails exactly one coupon across repeated calls`, async () => {
    const h = harness(env);
    const { AutoCouponService } = h.load("server/services/autoCoupon.ts");
    assert.equal((await AutoCouponService.generateCouponsForNewSubscriber(1, h.recipient.email)).couponsCreated, 1);
    assert.equal((await AutoCouponService.generateCouponsForNewSubscriber(1, h.recipient.email)).couponsCreated, 0);
    assert.equal(h.calls.luma, 1);
    assert.equal(h.calls.writes, 1);
    assert.equal(h.calls.emails, 1);
    assert.equal(h.calls.locks, 2);
  });
}

test("coupon email entry point refuses development sends even with credentials configured", async () => {
  const h = harness({ NODE_ENV: "development", SENDGRID_API_KEY: "test-placeholder" });
  const email = h.load("server/email.ts");
  await assert.rejects(email.sendCouponNotificationEmail(h.recipient.email, {
    eventTitle: "Summit", discountPercent: 100, registrationLink: "https://example.test",
  }), { message: COUPONS_DISABLED_MESSAGE });
  assert.equal(h.calls.emails, 0);
  assert.equal(h.calls.reads, 0);
});

test("admin generation/backfill return a clear 403 without saving an active rule; turning off stays available", async () => {
  const h = harness({ NODE_ENV: "development" });
  h.load("server/routes/coupons.ts");
  async function request(key: string, body: object) {
    let status = 200;
    let payload: any;
    const res = { status(code: number) { status = code; return res; }, json(data: any) { payload = data; return res; } };
    await h.handlers.get(key)!({ session: { userId: 9 }, params: { eventApiId: "event-test" }, body }, res);
    return { status, payload };
  }
  const generate = await request("post /api/admin/coupons/generate", {});
  const backfill = await request("put /api/admin/auto-coupons/:eventApiId", { isActive: true, discountPercent: 100 });
  for (const result of [generate, backfill]) {
    assert.equal(result.status, 403);
    assert.equal(result.payload.error, COUPONS_DISABLED_MESSAGE);
  }
  assert.equal(h.calls.writes, 0);
  assert.equal(h.calls.luma, 0);
  assert.equal(h.calls.emails, 0);
  const disabled = await request("put /api/admin/auto-coupons/:eventApiId", { isActive: false });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.payload.backfill, null);
  assert.equal(h.calls.writes, 1);
});
