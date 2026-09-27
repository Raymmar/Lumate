---
name: Post-merge safety
description: Scope of unattended post-merge reconciliation in this project
---

Automated post-merge setup should restore locked dependencies, but should not run database schema pushes.

**Why:** The project uses an existing database and its schema push command is interactive and can make unintended changes when run unattended. Development workflow startup may also send real invitation emails, so avoid restarting it solely to verify setup.

**How to apply:** Keep post-merge setup non-interactive and idempotent. Handle schema changes as separately reviewed operations, and verify post-merge setup without unnecessary application restarts.