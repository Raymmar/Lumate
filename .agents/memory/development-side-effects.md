---
name: Development startup side effects
description: Safety constraint when restarting the application for verification
---

Development startup used to send real invitation emails (invitation processor runs immediately on start). It is now gated behind an explicit env flag in development.

**Why:** On 2026-09-27 a dev restart delivered real invitation emails.

**How to apply:** Never set the dev invitation flag casually.
