import assert from "node:assert/strict";
import { test } from "node:test";
import { apiRequest } from "./queryClient";

test("API requests take the URL first and return parsed JSON, not a Response", async (t) => {
  const url = "/api/stripe/create-checkout-session";
  const body = { returnPath: "/settings" };
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    assert.equal(input, url);
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "include");
    assert.equal(init?.body, JSON.stringify(body));
    return Response.json({ url: "https://example.com/checkout" });
  };
  const result = await apiRequest<{ url: string }>(url, "POST", body);
  assert.deepEqual(result, { url: "https://example.com/checkout" });
});

test("API requests reject unsuccessful responses before consuming success JSON", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response("Payment unavailable", { status: 503 });
  await assert.rejects(apiRequest("/api/stripe/create-checkout-session", "POST"), /503: Payment unavailable/);
});
