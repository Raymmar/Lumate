import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { selectSummitCoupon } from "../../shared/summitTicket";

// Isolated execution of the real route, premium check and client hook.
// No database, authenticated session bypass, or Stripe/Luma request is involved.
function load(path: string, dependencies: Record<string, any>) {
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, console, Date,
    require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

for (const premiumSource of ["manual", "luma", "admin"]) {
  test(`a prior-year ${premiumSource} grant retains Premium but does not count as a recurring membership`, async () => {
    const user = {
      id: 12, email: "member@example.test", subscriptionStatus: "inactive",
      premiumSource, premiumExpiresAt: "2099-12-31T23:59:59Z",
      premiumGrantedAt: "2025-01-01T00:00:00Z", isAdmin: premiumSource === "admin",
    };
    const { hasActivePremium } = load("server/utils/premiumCheck.ts", {
      "../db": {}, "@shared/schema": {}, "drizzle-orm": {},
    });
    const handlers = new Map<string, Function>();
    const router = {
      use() {}, post() {},
      get(path: string, handler: Function) { handlers.set(path, handler); },
    };
    load("server/routes/stripe.ts", {
      express: { Router: () => router },
      "../storage": { storage: { getUserById: async () => user } },
      "../services/stripe": { StripeService: { getSubscriptionStatus: async () => ({ status: "inactive" }) } },
      "../services/LumaMembershipService": {}, "../services/autoCoupon": {}, "../email": {},
      "../utils/premiumCheck": { hasActivePremium },
    });
    let response: any;
    await handlers.get("/subscription-status")!(
      { session: { userId: user.id } },
      { json: (data: any) => { response = data; }, status: () => { throw new Error("Unexpected failure"); } },
    );
    assert.equal(response.status, "inactive", "Stripe billing state stays unchanged");
    assert.equal(response.hasPremiumAccess, true);
    // /auth/me need not expose the grant fields: the hook uses the actual status response.
    const { useSubscription } = load("client/src/hooks/use-subscription.ts", {
      "./use-auth": { useAuth: () => ({ user: { id: 12, isAdmin: user.isAdmin } }) },
      "@tanstack/react-query": { useQuery: () => ({ data: response, isLoading: false, isError: false }) },
    });
    assert.equal(useSubscription().isPremium, true);
    assert.equal(useSubscription().hasActiveSubscription, false);
    assert.equal(selectSummitCoupon([], "featured-summit"), undefined);
  });
}

test("only an actual active Stripe subscription counts as a recurring membership", () => {
  for (const [data, expected] of [
    [{ status: "active", subscriptionId: "sub-active" }, true],
    [{ status: "inactive", hasPremiumAccess: true }, false],
    [{ status: "active" }, false],
    [{ status: "canceled", subscriptionId: "sub-old" }, false],
  ] as const) {
    const { useSubscription } = load("client/src/hooks/use-subscription.ts", {
      "./use-auth": { useAuth: () => ({ user: { id: 12, isAdmin: false } }) },
      "@tanstack/react-query": { useQuery: () => ({ data, isLoading: false, isError: false }) },
    });
    assert.equal(useSubscription().hasActiveSubscription, expected);
  }
});
