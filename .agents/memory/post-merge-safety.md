---
name: Post-merge safety
description: Scope of unattended post-merge reconciliation in this project
---

Automated post-merge setup restores locked dependencies and re-applies the idempotent hand-written SQL files to the development database. It must never run drizzle-kit push.

**Why:** push is interactive and would drop tables outside the Drizzle schema (e.g. session). Skipping schema application entirely once left dev without a merged feature's tables, so its pages were blank.

**How to apply:** Only idempotent SQL (IF NOT EXISTS) goes in the migrations SQL files. Production schema comes from Publish, not from post-merge.

**Package firewall blocks:** the package firewall can start blocking a version pinned in the lockfile (e.g. a new critical CVE). `npm ci` deletes node_modules before failing, so the app breaks on its next restart. Fix by bumping that package within its existing semver range (`npm update <pkg>`), then re-run post-merge setup. Seen 2026-10-15 with proxy-addr 2.0.7 → 2.0.8.

**Dependency integrity in forked workspaces:** do not assume an existing dependency tree is complete.

**Why:** A fork contained both truncated executable binaries and missing package entry points. Repairing individual tools hid the broader installation problem and produced misleading version errors.

**How to apply:** When unrelated installed tools crash or package files are missing, restore the locked dependency tree before changing application code or dependency versions.
