import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { insertSummitSchema } from "../../../../shared/schema";
import type { TicketCoupon } from "../../../../shared/summitTicket";

const bundle = await build({
  stdin: {
    contents: 'export { SummitHero } from "./client/src/components/summit/SummitHero"; export { SummitTicketOffer } from "./client/src/components/memberships/SummitTicketOffer"; export { CurrentSummitTicket } from "./client/src/components/memberships/CurrentSummitTicket"; export { AuthProvider } from "./client/src/hooks/use-auth"; export { Router } from "wouter"; export { QueryClient, QueryClientProvider } from "@tanstack/react-query";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  loader: { ".png": "dataurl" },
  write: false,
});
const loaded = { exports: {} as any };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url), loaded, loaded.exports,
);
// Use the bundle's CJS query context; mixing it with the ESM export creates two providers.
const { SummitHero, QueryClient, QueryClientProvider } = loaded.exports;
interface Viewer {
  user?: { id: number; isAdmin?: boolean } | null;
  coupons?: TicketCoupon[];
  subscription?: { status: string; hasPremiumAccess?: boolean; subscriptionId?: string };
  pending?: "auth" | "coupons" | "subscription";
  error?: "auth" | "coupons" | "subscription";
}
function renderHero(props: Record<string, unknown>, viewer: Viewer = {}, Component = SummitHero) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["/api/summits", "current"], { summit });
  client.setQueryData(["/api/stripe/premium-price"], { formattedPrice: "$250", interval: "year" });
  const user = viewer.user ?? null;
  const keys = {
    auth: ["/api/auth/me"],
    coupons: ["/api/user/coupons", user?.id],
    subscription: ["/api/subscription/status", user?.id],
  };
  const data = {
    auth: user,
    coupons: { coupons: viewer.coupons ?? [] },
    subscription: viewer.subscription ?? { status: "inactive", hasPremiumAccess: false },
  };
  for (const name of ["auth", "coupons", "subscription"] as const) {
    if (viewer.pending !== name) client.setQueryData(keys[name], data[name]);
    if (viewer.error === name) client.getQueryCache().find({ queryKey: keys[name] })!.setState({
      status: "error", error: new Error("Lookup failed"),
    });
  }
  try {
    return renderToStaticMarkup(createElement(QueryClientProvider, { client },
      createElement(loaded.exports.AuthProvider, null,
        createElement(loaded.exports.Router, { ssrPath: "/summit" }, createElement(Component, props)),
      ),
    ));
  } finally {
    client.clear();
  }
}
const summit = {
  year: 2027,
  title: "Sarasota Tech Summit",
  ticketUrl: "https://example.test/tickets",
  lumaEventApiId: "evt-2027",
};
const coupon: TicketCoupon = {
  id: 1, eventApiId: summit.lumaEventApiId, eventTitle: "Summit",
  eventUrl: "https://luma.com/sts27?utm_source=member#register",
  code: "MY CODE&+", discountPercent: 100, status: "issued",
  lumaCouponApiId: "coupon-1", remainingCount: 1, validStartAt: null, validEndAt: null,
};

test("summit create and edit validation preserves both toggle values", () => {
  for (const showLearnMore of [true, false]) {
    assert.equal(insertSummitSchema.parse({ ...summit, showLearnMore }).showLearnMore, showLearnMore);
    assert.equal(insertSummitSchema.partial().parse({ showLearnMore }).showLearnMore, showLearnMore);
  }
  assert.equal(insertSummitSchema.partial().parse({ title: "Updated title" }).showLearnMore, undefined);
  assert.equal(insertSummitSchema.safeParse({ ...summit, showLearnMore: "false" }).success, false);
});

test("enabled Learn more links to the matching annual page", () => {
  const html = renderHero({ summit, isPast: false, showLearnMore: true });
  assert.match(html, /Learn more/);
  assert.match(html, /href="\/summit\/2027"/);
  assert.match(html, /Get Tickets/);
});

test("disabled Learn more leaves ticket access unchanged", () => {
  const html = renderHero({ summit, isPast: false, showLearnMore: false });
  assert.doesNotMatch(html, /Learn more/);
  assert.match(html, /href="https:\/\/example.test\/tickets"/);
  assert.match(html, /Get Tickets/);
});

test("annual pages do not show a self-link by default", () => {
  const html = renderHero({ summit, isPast: false });
  assert.doesNotMatch(html, /Learn more/);
});

test("Learn more is available even when no ticket link is configured", () => {
  const html = renderHero({
    summit: { ...summit, ticketUrl: null }, isPast: false, showLearnMore: true,
  });
  assert.match(html, /Learn more/);
  assert.doesNotMatch(html, /Get Tickets/);
});

test("a site ticket link opens the Memberships offer in the same tab", () => {
  const html = renderHero({ summit: { ...summit, ticketUrl: "/memberships" }, isPast: false });
  assert.match(html, /href="\/memberships"/);
  assert.match(html, /Get Tickets/);
  assert.doesNotMatch(html, /target="_blank"[^>]*>Get Tickets/);
  assert.doesNotMatch(html, /href="\/memberships"[^>]*target=/);
});

test("external ticket links, including Luma, still open in a new tab", () => {
  for (const ticketUrl of ["https://luma.com/sts27", "https://lu.ma/abc?coupon=X"]) {
    const html = renderHero({ summit: { ...summit, ticketUrl }, isPast: false });
    const anchor = html.match(/<a[^>]*data-testid="button-summit-tickets"[^>]*>/)?.[0] ?? "";
    assert.match(anchor, /target="_blank"/);
    assert.match(anchor, /rel="noopener noreferrer"/);
  }
});

test("both hero placements claim the exact event's issued coupon without requiring a subscription", () => {
  for (const showLearnMore of [true, false]) {
    const html = renderHero({ summit: { ...summit, ticketUrl: "/memberships" }, isPast: false, showLearnMore }, {
      user: { id: 42 }, coupons: [{ ...coupon, id: 2, eventApiId: "evt-2026", code: "OLD" }, coupon],
    });
    assert.match(html, /Claim Your Ticket/);
    assert.match(html, /href="https:\/\/luma.com\/sts27\?utm_source=member&amp;coupon=MY\+CODE%26%2B#register"/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"[^>]*data-testid="button-summit-tickets"/);
    assert.doesNotMatch(html, /Get Tickets|href="\/memberships"|coupon=OLD/);
    assert.equal(html.includes("Learn more"), showLearnMore);
  }
});

test("a usable coupon still works without a general ticket URL", () => {
  const html = renderHero({ summit: { ...summit, ticketUrl: null }, isPast: false }, {
    user: { id: 42 }, coupons: [coupon],
  });
  assert.match(html, /Claim Your Ticket/);
});

test("admin, grants and last year's ticket retain the purchase CTA without a recurring subscription", () => {
  const viewers: Viewer[] = [
    { user: { id: 42, isAdmin: true } },
    { user: { id: 42 }, subscription: { status: "inactive", hasPremiumAccess: true } },
    { user: { id: 42 }, subscription: { status: "inactive", hasPremiumAccess: true }, coupons: [{ ...coupon, eventApiId: "evt-2026" }] },
  ];
  for (const viewer of viewers) {
    const html = renderHero({ summit: { ...summit, ticketUrl: "/memberships" }, isPast: false }, viewer);
    assert.match(html, /Get Tickets/);
    assert.match(html, /href="\/memberships"/);
    assert.doesNotMatch(html, /Claim Your Ticket|No available coupon|email|settings/);
    // Both home and account use this same full-width offer.
    const ticketHtml = renderHero({}, viewer, loaded.exports.CurrentSummitTicket);
    assert.match(ticketHtml, /Get your ticket/);
    assert.match(ticketHtml, /button-buy-summit-ticket/);
    assert.match(ticketHtml, /renews automatically/);
    assert.doesNotMatch(ticketHtml, /No available coupon|ready to claim/);
  }
});

test("an actual active recurring subscription without a coupon does not trigger a duplicate purchase", () => {
  const html = renderHero({ summit, isPast: false }, {
    user: { id: 42 }, subscription: { status: "active", subscriptionId: "sub-active" },
  });
  assert.match(html, /No available coupon for this Summit/);
  assert.doesNotMatch(html, /Claim Your Ticket|Get Tickets/);
});

test("unusable or different-year coupons retain the nonmember's original ticket destination", () => {
  for (const patch of [
    { eventApiId: "evt-2026" }, { status: "redeemed" }, { status: "expired" },
    { remainingCount: 0 }, { validStartAt: "2999-01-01" }, { validEndAt: "2000-01-01" },
    { lumaCouponApiId: null }, { eventUrl: "https://evil.test/event" },
  ]) {
    const html = renderHero({ summit, isPast: false }, { user: { id: 42 }, coupons: [{ ...coupon, ...patch }] });
    assert.match(html, /Get Tickets/);
    assert.match(html, /href="https:\/\/example.test\/tickets"/);
    assert.doesNotMatch(html, /Claim Your Ticket|coupon=/);
  }
});

test("loading and failed authenticated lookups never flash purchase or stale claim links", () => {
  for (const name of ["auth", "coupons", "subscription"] as const) {
    for (const state of ["pending", "error"] as const) {
      const html = renderHero({ summit, isPast: false, showLearnMore: true }, {
        user: { id: 42 }, [state]: name,
        // Even a cached coupon must be hidden after an authentication or coupon lookup failure.
        coupons: name === "subscription" ? [] : [coupon],
      });
      assert.match(html, state === "pending" ? /Checking your ticket/ : /couldn&#x27;t check your ticket/);
      assert.doesNotMatch(html, /Get Tickets|Claim Your Ticket|No available coupon|coupon=/);
      assert.match(html, /Learn more/);
      if (state === "error") assert.match(html, /Try again/);
    }
  }
});

test("verified coupons don't depend on a successful subscription lookup", () => {
  for (const state of ["pending", "error"] as const) {
    const html = renderHero({ summit, isPast: false }, { user: { id: 42 }, coupons: [coupon], [state]: "subscription" });
    assert.match(html, /Claim Your Ticket/);
  }
});

test("signed-out visitors never use another user's cached coupons", () => {
  const html = renderHero({ summit, isPast: false }, { coupons: [coupon] });
  assert.match(html, /Get Tickets/);
  assert.doesNotMatch(html, /Claim Your Ticket|coupon=/);
});

test("past heroes preserve Event Page, sponsor presentation and Learn more regardless of lookup state", () => {
  for (const viewer of [{ user: { id: 42 }, coupons: [coupon] }, { pending: "auth" as const }, { error: "auth" as const }]) {
    const html = renderHero({
      summit: { ...summit, presentingSponsorId: 3, presentingSponsor: { name: "Sponsor", url: "https://sponsor.test" } },
      isPast: true, showLearnMore: true,
    }, viewer);
    assert.match(html, /Event Page/);
    assert.match(html, /href="https:\/\/example.test\/tickets"/);
    assert.match(html, /Presented by/);
    assert.match(html, /href="https:\/\/sponsor.test"/);
    assert.match(html, /Learn more/);
    assert.doesNotMatch(html, /Claim Your Ticket|Get Tickets|Checking your ticket|Try again/);
  }
});

test("shared ticket describes an annual membership, not a year of Premium", () => {
  for (const price of ["$250", null]) {
    const html = renderToStaticMarkup(createElement(loaded.exports.Router, { ssrPath: "/memberships" },
      createElement(loaded.exports.SummitTicketOffer, {
        summit, price, interval: "year", hasActiveSubscription: false, onBuy: async () => {},
      }),
    ));
    assert.match(html, /Your Summit ticket, with an annual membership included\./);
    assert.match(html, /Annual membership included/);
    assert.match(html, /Checkout starts an annual membership that renews automatically/);
    assert.doesNotMatch(html, /Premium|a year of/);
  }
});

test("shared membership ticket uses neutral copy without a verified coupon", () => {
  for (const state of [{ hasActiveSubscription: true }, { pending: true }, { lookupError: true }]) {
    const html = renderToStaticMarkup(createElement(loaded.exports.Router, { ssrPath: "/memberships" },
      createElement(loaded.exports.SummitTicketOffer, {
        summit, price: "$199", interval: "year", hasActiveSubscription: false, onBuy: async () => {}, ...state,
      }),
    ));
    assert.doesNotMatch(html, /button-buy-summit-ticket|ready to claim|find.*(?:email|settings)|membership included free/);
    if ("hasActiveSubscription" in state) assert.match(html, /No available coupon was found for this Summit/);
    if ("pending" in state) assert.match(html, /Checking your ticket/);
    if ("lookupError" in state) assert.match(html, /Try again/);
  }
});

test("internalPath only treats this site's links as internal", async () => {
  const { internalPath } = await import("../../lib/links");
  const origin = "https://sarasota.tech";
  assert.equal(internalPath("/memberships", origin), "/memberships");
  assert.equal(internalPath(" /memberships?ref=summit ", origin), "/memberships?ref=summit");
  assert.equal(internalPath("https://sarasota.tech/memberships#ticket", origin), "/memberships#ticket");
  assert.equal(internalPath("https://luma.com/sts27", origin), null);
  assert.equal(internalPath("//evil.example/memberships", origin), null);
  assert.equal(internalPath("", origin), null);
  assert.equal(internalPath(null, origin), null);
  assert.equal(internalPath("https://sarasota.tech/memberships"), null, "no origin known: treat absolute links as external");
});
