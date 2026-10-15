import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLiveModeKey,
  setUpManagedWebhookForEnvironment,
  type ManagedWebhookRecord,
  type ManagedWebhookSync,
  type StripeWebhookEndpoint,
  type WebhookSetupEnv,
} from "./stripeWebhookSetup";

/**
 * In-memory stand-in for StripeSync. findOrCreateManagedWebhook mirrors
 * stripe-replit-sync: reuse an enabled endpoint whose base URL matches a
 * stored record, otherwise create a new endpoint with a fresh UUID.
 */
function fakeSync(initial: Array<ManagedWebhookRecord & { status?: string }> = []) {
  const endpoints = new Map<string, StripeWebhookEndpoint>();
  const records: ManagedWebhookRecord[] = [];
  for (const r of initial) {
    endpoints.set(r.id, { id: r.id, url: r.url, status: r.status ?? "enabled" });
    records.push({ id: r.id, url: r.url, uuid: r.uuid });
  }
  let created = 0;

  const sync: ManagedWebhookSync = {
    async listManagedWebhooks() {
      return [...records];
    },
    async findOrCreateManagedWebhook(baseUrl) {
      for (const r of records) {
        if (r.url.replace(/\/[^/]+$/, "") !== baseUrl) continue;
        const ep = endpoints.get(r.id);
        if (ep?.status === "enabled") return { webhook: ep, uuid: r.uuid };
      }
      created++;
      const uuid = `uuid-${created}`;
      const ep = { id: `we_${created}`, url: `${baseUrl}/${uuid}`, status: "enabled" };
      endpoints.set(ep.id, ep);
      records.push({ id: ep.id, url: ep.url, uuid });
      return { webhook: ep, uuid };
    },
    stripe: {
      webhookEndpoints: {
        async retrieve(id) {
          const ep = endpoints.get(id);
          if (!ep) throw new Error("No such webhook endpoint");
          return ep;
        },
      },
    },
  };
  return { sync, created: () => created };
}

const devEnv = (domain: string, overrides: Partial<WebhookSetupEnv> = {}): WebhookSetupEnv => ({
  isDeployment: false,
  domain,
  devCreationOptIn: false,
  liveModeKey: true,
  ...overrides,
});

test("repeated development starts on new dev domains never create live endpoints", async () => {
  const { sync, created } = fakeSync();
  for (let i = 0; i < 20; i++) {
    const result = await setUpManagedWebhookForEnvironment(sync, devEnv(`workspace-${i}.spock.replit.dev`));
    assert.equal(result.action, "skipped");
  }
  assert.equal(created(), 0);
});

test("opting in during development still refuses to create live-mode endpoints", async () => {
  const { sync, created } = fakeSync();
  for (let i = 0; i < 5; i++) {
    const result = await setUpManagedWebhookForEnvironment(
      sync,
      devEnv("workspace.spock.replit.dev", { devCreationOptIn: true, liveModeKey: true }),
    );
    assert.equal(result.action, "skipped");
  }
  assert.equal(created(), 0);
});

test("development reuses an enabled endpoint already registered for its domain", async () => {
  const domain = "workspace.spock.replit.dev";
  const { sync, created } = fakeSync([
    { id: "we_disabled", url: `https://${domain}/api/stripe/webhook/old`, uuid: "old", status: "disabled" },
    { id: "we_existing", url: `https://${domain}/api/stripe/webhook/abc`, uuid: "abc" },
  ]);
  for (let i = 0; i < 5; i++) {
    const result = await setUpManagedWebhookForEnvironment(sync, devEnv(domain));
    assert.deepEqual(result, { action: "reused", url: `https://${domain}/api/stripe/webhook/abc`, uuid: "abc" });
  }
  assert.equal(created(), 0);
});

test("development opt-in with a test-mode key creates at most one endpoint per domain", async () => {
  const { sync, created } = fakeSync();
  const env = devEnv("workspace.spock.replit.dev", { devCreationOptIn: true, liveModeKey: false });
  const first = await setUpManagedWebhookForEnvironment(sync, env);
  assert.equal(first.action, "created-or-reused");
  for (let i = 0; i < 5; i++) {
    const again = await setUpManagedWebhookForEnvironment(sync, env);
    assert.equal(again.action, "reused");
  }
  assert.equal(created(), 1);
});

test("production keeps find-or-create on the deployment domain without duplicates", async () => {
  const { sync, created } = fakeSync();
  const env: WebhookSetupEnv = { isDeployment: true, domain: "lumate.replit.app", devCreationOptIn: false, liveModeKey: true };
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await setUpManagedWebhookForEnvironment(sync, env));
  assert.equal(created(), 1);
  for (const r of results) {
    assert.equal(r.action, "created-or-reused");
    assert.ok("url" in r && r.url.startsWith("https://lumate.replit.app/api/stripe/webhook/"));
  }
});

test("production reuses its existing managed endpoint", async () => {
  const { sync, created } = fakeSync([
    { id: "we_prod", url: "https://lumate.replit.app/api/stripe/webhook/prod-uuid", uuid: "prod-uuid" },
  ]);
  const result = await setUpManagedWebhookForEnvironment(sync, {
    isDeployment: true,
    domain: "lumate.replit.app",
    devCreationOptIn: false,
    liveModeKey: true,
  });
  assert.deepEqual(result, {
    action: "created-or-reused",
    url: "https://lumate.replit.app/api/stripe/webhook/prod-uuid",
    uuid: "prod-uuid",
  });
  assert.equal(created(), 0);
});

test("missing domain skips setup in every environment", async () => {
  const { sync, created } = fakeSync();
  for (const isDeployment of [true, false]) {
    const result = await setUpManagedWebhookForEnvironment(sync, {
      isDeployment,
      domain: undefined,
      devCreationOptIn: true,
      liveModeKey: false,
    });
    assert.equal(result.action, "skipped");
  }
  assert.equal(created(), 0);
});

test("live-mode key detection", () => {
  assert.equal(isLiveModeKey("sk_live_abc"), true);
  assert.equal(isLiveModeKey("rk_live_abc"), true);
  assert.equal(isLiveModeKey("sk_test_abc"), false);
  assert.equal(isLiveModeKey("rk_test_abc"), false);
});
