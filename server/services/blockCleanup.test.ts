import { test } from "node:test";
import assert from "node:assert/strict";
import { runBlockCleanup } from "./blockCleanup";

test("successful cleanup deduplicates primary and linked emails", async () => {
  const removed: string[] = [];
  const failures = await runBlockCleanup({
    primaryEmail: "Primary@example.test",
    deleteSessions: async () => {},
    getEmails: async () => ["primary@example.test", "other@example.test"],
    removeEmail: async email => { removed.push(email); return true; },
  });
  assert.deepEqual(failures, []);
  assert.deepEqual(removed, ["primary@example.test", "other@example.test"]);
});

test("session, false-return and thrown removal failures are all surfaced", async () => {
  const removed: string[] = [];
  const failures = await runBlockCleanup({
    primaryEmail: "primary@example.test",
    deleteSessions: async () => { throw new Error("DB unavailable"); },
    getEmails: async () => ["other@example.test", "last@example.test"],
    removeEmail: async email => {
      removed.push(email);
      if (email.startsWith("primary")) return false;
      if (email.startsWith("other")) throw new Error("API unavailable");
      return true;
    },
  });
  assert.equal(failures.length, 3);
  assert.match(failures[0], /Session deletion/);
  assert.equal(removed.length, 3);
});

test("linked lookup failure does not prevent primary removal", async () => {
  const removed: string[] = [];
  const failures = await runBlockCleanup({
    primaryEmail: "primary@example.test",
    deleteSessions: async () => {},
    getEmails: async () => { throw new Error("Lookup failed"); },
    removeEmail: async email => { removed.push(email); return true; },
  });
  assert.deepEqual(failures, ["Linked Luma profiles could not be loaded"]);
  assert.deepEqual(removed, ["primary@example.test"]);
});

test("retry can complete previously failed cleanup", async () => {
  let available = false;
  const deps = {
    primaryEmail: "primary@example.test",
    deleteSessions: async () => {},
    getEmails: async () => [],
    removeEmail: async () => available,
  };
  assert.equal((await runBlockCleanup(deps)).length, 1);
  available = true;
  assert.deepEqual(await runBlockCleanup(deps), []);
});