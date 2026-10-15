---
name: Post-merge safety
description: Scope of unattended post-merge reconciliation in this project
---

Automated post-merge setup restores locked dependencies and re-applies the idempotent hand-written SQL files to the development database. It must never run drizzle-kit push.

**Why:** push is interactive and would drop tables outside the Drizzle schema (e.g. session). Skipping schema application entirely once left dev without a merged feature's tables, so its pages were blank.

**How to apply:** Only idempotent SQL (IF NOT EXISTS) goes in the migrations SQL files. Production schema comes from Publish, not from post-merge.

Unique constraints need validation against existing production records before publishing; development cleanup does not prepare production data.

**Why:** Publish copies schema differences, not the data-cleanup statements in development migration scripts. A badge uniqueness change passed in development but publishing was blocked by an existing duplicate award in production.

**How to apply:** Inspect production read-only before tightening constraints. If historical records conflict, defer the constraint and keep application writes compatible unless the owner explicitly approves a record-preserving cleanup plan. Never replace production data with development data to bypass validation.

Historical duplicate badge awards must be preserved, not automatically removed.

**Why:** The owner explicitly chose publishing with no data loss over enforcing uniqueness on old badge records. Duplicate prevention is less important than preserving live data.

**How to apply:** Prevent new duplicate awards without requiring historical cleanup. Any future deduplication needs separate, explicit approval.

**Package firewall blocks:** the package firewall can start blocking a version pinned in the lockfile (e.g. a new critical CVE). `npm ci` deletes node_modules before failing, so the app breaks on its next restart. Fix by bumping that package within its existing semver range (`npm update <pkg>`), then re-run post-merge setup. Seen 2026-10-15 with proxy-addr 2.0.7 → 2.0.8.

**Dependency integrity in forked workspaces:** do not assume an existing dependency tree is complete.

**Why:** Forks have contained truncated executable binaries, missing package entry points, and missing bundled TypeScript declarations even when JavaScript was present. Repairing individual tools hid the broader installation problem and produced misleading version and type errors; incremental installs can report success without restoring missing files.

**How to apply:** When unrelated installed tools crash or package files are missing, confirm package contents and restore the locked dependency tree before changing application code, types, or dependency versions. Do not add untyped module declarations to hide an installation problem.
