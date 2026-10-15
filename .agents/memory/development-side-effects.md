---
name: Development startup side effects
description: Safety constraint when restarting the application for verification
---

Development startup used to send real invitation emails (invitation processor runs immediately on start). It is now gated behind an explicit env flag in development.

**Why:** On 2026-09-27 a dev restart delivered real invitation emails.

**How to apply:** Never set the dev invitation flag casually.

Coupon creation, backfills (including Luma repair), and coupon notification emails must also be disabled outside production unless explicitly opted in. Never enable `ENABLE_DEV_COUPONS=true` casually.

**Why:** Development has real Luma and SendGrid credentials. Stripe reconciliation after a restart or merge can activate members and otherwise create real Summit coupons and send real email.

**How to apply:** Verify with isolated tests and read-only previews. The opt-in authorizes real external side effects, not a dry run; leave it unset for normal development and post-merge work.
