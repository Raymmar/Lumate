---
name: Post-merge safety
description: Scope of unattended post-merge reconciliation in this project
---

Automated post-merge setup restores locked dependencies and re-applies the idempotent hand-written SQL files to the development database. It must never run drizzle-kit push.

**Why:** push is interactive and would drop tables outside the Drizzle schema (e.g. session). Skipping schema application entirely once left dev without a merged feature's tables, so its pages were blank.

**How to apply:** Only idempotent SQL (IF NOT EXISTS) goes in the migrations SQL files. Production schema comes from Publish, not from post-merge.
