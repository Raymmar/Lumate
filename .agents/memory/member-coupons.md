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
- Customer-facing ticket copy says “annual membership included,” not “Premium membership” or “a year of Premium.”
  **Why:** The owner distinguishes buying a Summit ticket with annual membership included from the plan name, which remains “Premium” on the Memberships page.
  **How to apply:** Use annual membership wording throughout the shared ticket, including its description, included-membership label, and renewal terms; keep the pricing plan name unchanged.
- The Memberships ticket purchase offer is just Premium checkout. Its availability must not depend on coupon automation; actual existing coupons may additionally be presented as personal claim tickets.
  **Why:** the owner was explicit (Oct 2026): "the membership is just something you buy, and then, if we want, we add this other automation in the back."
  **How to apply:** Keep coupon issuance in admin/back-office tools, never page rendering. Personalized claim tickets on Memberships and home/dashboard/account may read existing coupons without making membership sales depend on them.
- Premium access is not proof of a current Summit coupon or entitlement to future tickets. Confirm an actual usable coupon before claiming it exists or telling someone to find it in email/settings.
  **Why:** The owner explained that a previous year's ticket may have granted membership without an active subscription; admin/granted Premium access must not imply future tickets.
  **How to apply:** Base personalized ticket messaging on the person's issued coupon for that exact event, not admin, Premium, or subscription flags. Do not expand coupon issuance eligibility as a UI fix.
- Premium access without a recurring membership must NOT suppress the ticket/membership purchase CTA, including on account settings.
  **Why:** The owner explicitly corrected this on 2026-10-15: last year's ticket can grant Premium without a recurring membership, and the goal is to sell that person a recurring membership for this year's ticket.
  **How to apply:** Offer “Get your ticket” to people without a usable current-event coupon or an active recurring subscription, even if they have Premium/admin/granted access. Keep actual coupon holders on the claim action.
- The home-page ticket belongs below the main navigation, above the entire core grid, and follows Memberships' active/current and not-past Summit visibility.
  **Why:** The owner explicitly selected this placement and date gating for the home CTA on 2026-10-15; it is not meant to appear on every dashboard-layout page.
  **How to apply:** Share the existing Memberships visibility rule; keep this home-only placement outside the feed/sidebar grid.
- Reuse the exact full-width Memberships ticket on home and the member dashboard/account area; never substitute a compact card.
  **Why:** The owner corrected the compact-card plan on 2026-10-15 and explicitly requires the same prominent ticket, spanning full width even in the dashboard.
  **How to apply:** Keep the same responsive ticket design above the page columns. A possible dismiss control is not permission to shrink or redesign it. Claim eligibility comes from the linked event's usable coupon, not membership status. Luma synchronization confirms redemption, never a claim click.
- The home ticket must align with the core grid's horizontal content padding without changing its vertical spacing.
  **Why:** The owner explicitly corrected the wider home ticket on 2026-10-15 and specified left/right padding only.
  **How to apply:** Apply the grid's responsive horizontal inset only on home; keep the full-width ticket above both columns and leave other placements unchanged.
