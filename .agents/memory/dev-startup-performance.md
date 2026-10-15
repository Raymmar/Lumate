---
name: Dev startup slowness and orphan servers
description: Why the dev preview loads slowly after restarts/merges, and the orphan-server trap
---

- After task merges, an orphan dev server can keep holding port 5000 while the workflow reports not started; restarts then fail with port-in-use. Kill the stale tsx/node processes, then restart the workflow.
- Every server start immediately runs the Luma people sync, which paged through the whole people list (1,200+) despite the created-after filter, so Luma seems to ignore that filter for people. The Stripe backfill also fires ~250 small batches. While these run, API responses go from ~10–50ms to ~700ms.
- The first visit after dependency changes makes Vite re-optimize deps and force-reload the page (seen 2026-10-15).
- All pages are imported eagerly in the client router (no lazy loading), so dev full loads fetch hundreds of modules.

**Why:** Diagnosed 2026-10-15 when the owner asked why the app loads slowly.
**How to apply:** Check for orphan servers and startup syncs before blaming new code for slow loads.
