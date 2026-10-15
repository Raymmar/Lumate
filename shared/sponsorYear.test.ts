import assert from "node:assert/strict";
import { test } from "node:test";
import { getAnnualSponsorYear } from "./sponsorYear";

test("annual sponsorships switch at January 1 in Sarasota, regardless of server/browser timezone", () => {
  assert.equal(getAnnualSponsorYear(new Date("2027-01-01T04:59:59.999Z")), 2026);
  assert.equal(getAnnualSponsorYear(new Date("2027-01-01T05:00:00.000Z")), 2027);
  assert.equal(getAnnualSponsorYear(new Date("2026-10-15T00:00:00Z")), 2026);
  assert.equal(getAnnualSponsorYear(new Date("2028-01-01T05:00:00Z")), 2028);
});
