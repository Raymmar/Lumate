import assert from "node:assert/strict";
import { test } from "node:test";
import { isSummitTicketDismissed, SUMMIT_TICKET_DISMISSAL_SECONDS } from "./summit-ticket-dismissal";

test("dismissal lasts one week for the same Summit across page loads", () => {
  const now = 1_000_000;
  const until = now + SUMMIT_TICKET_DISMISSAL_SECONDS * 1000;
  const storedCookieValue = `42:${until}`;
  assert.equal(SUMMIT_TICKET_DISMISSAL_SECONDS, 604800);
  assert.equal(isSummitTicketDismissed(storedCookieValue, 42, now), true);
  assert.equal(isSummitTicketDismissed(storedCookieValue, 42, until - 1), true);
  assert.equal(isSummitTicketDismissed(storedCookieValue, 42, until), false);
});

test("another Summit and missing or invalid preferences do not hide the ticket", () => {
  assert.equal(isSummitTicketDismissed("42:9999999", 43, 100), false);
  for (const value of ["", "42", "42:invalid", "42:0"]) {
    assert.equal(isSummitTicketDismissed(value, 42, 100), false);
  }
});
