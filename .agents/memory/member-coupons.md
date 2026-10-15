---
name: Member event coupons
description: Rules for issuing Summit/event coupons to Premium members, backfills, and Luma coupon APIs.
---
- A member "has a coupon" for an event if any coupon (any status, matched by user id or case-insensitive email) exists. Never issue a second one.
  **Why:** owner requirement — repeated or partially failed backfills, and webhook + checkout-confirmation double calls, must never send duplicates.
  **How to apply:** route every new member coupon through the shared locked issuer; don't add a separate create path.
- If Luma coupon creation fails, nothing is saved or emailed; the next backfill retries with a fresh code. Old records without a Luma id (from earlier code that emailed anyway) are repaired with the SAME code and no email.
- Coupon creation still uses the legacy `api.lu.ma/public/v1/event/create-coupon` (it produced the production batches). Luma's newer `public-api.luma.com/v1/events/coupons/update` can change only remaining uses and valid dates (not discount/ticket type).
- Admin coupon controls belong in the existing Generate Coupons form (reopened via "Edit coupons"), not in new buttons/dialogs, and there is no per-member coupon editing.
  **Why:** owner was angry about extra UI; quote: "I just want to edit the actual generate coupon logic."
- Dev has a real SendGrid key and Luma key. Coupon side effects must stay opt-in outside production; see [Development side effects](development-side-effects.md). Verify with read-only previews and unit tests instead.
- Summit tickets are sold as Premium membership (live Stripe Premium price) via `/memberships`; there is no separate ticket product.
- The Memberships ticket purchase offer is just Premium checkout. Its availability must not depend on coupon automation; actual existing coupons may additionally be presented as personal claim tickets.
  **Why:** the owner was explicit (Oct 2026): "the membership is just something you buy, and then, if we want, we add this other automation in the back."
  **How to apply:** Keep coupon issuance in admin/back-office tools, never page rendering. The owner subsequently requested personalized claim tickets on Memberships, home/dashboard, and a compact account reminder (2026-10-15); that presentation may read existing coupons without making membership sales depend on them.
- The home-page ticket belongs below the main navigation, above the entire core grid, and follows Memberships' active/current and not-past Summit visibility.
  **Why:** The owner explicitly selected this placement and date gating for the home CTA on 2026-10-15; it is not meant to appear on every dashboard-layout page.
  **How to apply:** Share the existing Memberships visibility rule; keep this home-only placement outside the feed/sidebar grid.
