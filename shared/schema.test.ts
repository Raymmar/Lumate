import assert from "node:assert/strict";
import { test } from "node:test";
import {
  insertCompanyMemberSchema,
  insertCompanySchema,
  insertCompanyTagSchema,
  insertPersonSchema,
  insertUserSchema,
} from "./schema";

test("user and company custom links preserve optional string icons", () => {
  const links = [{ title: "Website", url: "https://example.com", icon: "globe" }];
  assert.deepEqual(insertUserSchema.parse({ email: "member@example.com", customLinks: links }).customLinks, links);
  assert.deepEqual(insertCompanySchema.parse({ name: "Example", customLinks: links }).customLinks, links);
  assert.equal(insertUserSchema.parse({ email: "member@example.com", customLinks: null }).customLinks, null);
  assert.equal(insertCompanySchema.parse({ name: "Example" }).customLinks, undefined);
  for (const customLinks of [[{ ...links[0], icon: 123 }], [{ title: "Invalid", url: "not-a-url" }], {}]) {
    assert.equal(insertUserSchema.safeParse({ email: "member@example.com", customLinks }).success, false);
    assert.equal(insertCompanySchema.safeParse({ name: "Example", customLinks }).success, false);
  }
});

test("person stats match the nullable dates and numeric values stored in the database", () => {
  const identity = { email: "person@example.com", api_id: "person-example" };
  const stats = {
    totalEventsAttended: 2,
    firstEventDate: null,
    lastEventDate: null,
    averageEventsPerYear: 2,
    lastUpdated: "2026-10-15T00:00:00.000Z",
  };
  assert.deepEqual(insertPersonSchema.parse({ ...identity, stats }).stats, stats);
  assert.equal(insertPersonSchema.parse(identity).stats, undefined);
  assert.equal(insertPersonSchema.parse({ ...identity, stats: null }).stats, null);
  assert.equal(insertPersonSchema.safeParse({ ...identity, stats: { ...stats, averageEventsPerYear: "2" } }).success, false);
  const { firstEventDate, ...missingDate } = stats;
  assert.equal(insertPersonSchema.safeParse({ ...identity, stats: missingDate }).success, false);
});

test("company memberships and tags require explicit integer relationship IDs", () => {
  assert.equal(insertCompanyMemberSchema.safeParse({ companyId: 1, userId: 2, addedBy: 3 }).success, true);
  for (const missingKey of ["companyId", "userId", "addedBy"]) {
    const values: Record<string, number> = { companyId: 1, userId: 2, addedBy: 3 };
    delete values[missingKey];
    assert.equal(insertCompanyMemberSchema.safeParse(values).success, false);
  }
  assert.equal(insertCompanyMemberSchema.safeParse({ companyId: 1.5, userId: 2, addedBy: 3 }).success, false);
  assert.equal(insertCompanyTagSchema.safeParse({ companyId: 1, tagId: 2 }).success, true);
  assert.equal(insertCompanyTagSchema.safeParse({ companyId: 1 }).success, false);
  assert.equal(insertCompanyTagSchema.safeParse({ tagId: 2 }).success, false);
});

test("public user creation does not accept server-managed verification and block flags", () => {
  const parsed = insertUserSchema.parse({
    email: "member@example.com",
    isAdmin: true,
    isVerified: true,
    blockedAt: "2026-10-15T00:00:00.000Z",
  });
  assert.equal("isAdmin" in parsed, false);
  assert.equal("isVerified" in parsed, false);
  assert.equal("blockedAt" in parsed, false);
});
