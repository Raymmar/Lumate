---
name: Stripe webhook endpoints
description: Why dev must not create Stripe webhook endpoints, and the stale endpoints left in the live account
---

The development Stripe connection holds a LIVE key (same account as production), and every workspace/task fork gets a different dev domain. The library's find-or-create only checks the local DB for the exact base URL, so each new environment used to add another live endpoint until Stripe's 16-endpoint limit was hit (2026-10-15).

Dev startup is now reuse-only; creation needs an opt-in flag and a test-mode key.

As of 2026-10-15 the live account still holds ~14 managed endpoints pointing at old dev domains (several already disabled by Stripe) plus two production endpoints on the production domain (one managed with UUID path, one legacy without). Do not delete any of these without the owner's explicit approval; never touch the production-domain ones.

**Why:** Hitting the limit would block production from creating its managed webhook if it ever needed a new one.
**How to apply:** Don't loosen the dev gate; if the owner wants cleanup, list endpoints read-only and ask before deleting.
