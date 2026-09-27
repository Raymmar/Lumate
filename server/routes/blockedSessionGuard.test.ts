import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import { blockedSessionGuard } from "./blockedSessionGuard";
import type { AddressInfo } from "node:net";

test("retained blocked admin session cannot self-unblock or access privileged routes", async () => {
  const app = express();
  const store = new session.MemoryStore();
  // Model failed session invalidation: the session remains in the store.
  store.destroy = (_sid, callback) => callback?.(new Error("Deletion unavailable"));
  app.use(session({ secret: "isolated-test-secret", store, resave: false, saveUninitialized: false }));
  let blocked = false;
  let lookupFails = false;
  app.use(blockedSessionGuard(async () => {
    if (lookupFails) throw new Error("DB unavailable");
    return { blockedAt: blocked ? "2026-01-01" : null };
  }));
  app.post("/login", (req, res) => { req.session.userId = 1; res.json({ ok: true }); });
  let unblockReached = false;
  app.post("/api/admin/users/1/unblock", (_req, res) => {
    unblockReached = true;
    blocked = false;
    res.json({ ok: true });
  });
  app.get("/api/admin/members", (_req, res) => res.json([]));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const login = await fetch(`${base}/login`, { method: "POST" });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    blocked = true;
    const response = await fetch(`${base}/api/admin/users/1/unblock`, { method: "POST", headers: { cookie } });
    assert.equal(response.status, 403);
    assert.equal(unblockReached, false);
    assert.equal(blocked, true);
    assert.equal((await fetch(`${base}/api/admin/members`, { headers: { cookie } })).status, 403);
    lookupFails = true;
    assert.equal((await fetch(`${base}/api/admin/members`, { headers: { cookie } })).status, 503);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});