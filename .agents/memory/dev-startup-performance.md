---
name: Dev startup slowness and orphan servers
description: Why the dev preview loads slowly after restarts/merges, the orphan-server trap, and how startup syncs are throttled
---

- After task merges, an orphan dev server can keep holding port 5000 while the workflow reports not started; restarts then fail with port-in-use. Kill the stale tsx/node processes, then restart the workflow.
- Incremental Luma people syncs page newest-first and stop at the last sync time; only the daily full refresh or the manual reset re-reads everyone.
- Client pages are lazy-loaded per route; navigation routes on a transitioned location so the old page stays visible while the next chunk loads. Home and not-found stay eager.
- The first visit after dependency changes makes Vite re-optimize deps and force-reload the page.
- Running a second dev server on another port (e.g. for timing) makes Replit add a [[ports]] entry to .replit — revert it.

**Why:** Diagnosed 2026-10-15 when the owner asked why the app loads slowly; throttling added the same day.
**How to apply:** Check for orphan servers and startup syncs before blaming new code for slow loads; keep new background jobs off the pre-listen path.

Development frontend errors must not terminate the backend through a custom logger.

**Why:** A frontend transform error can be transient during edits or dependency restoration; treating every Vite error as fatal takes down the entire preview and prevents recovery.

**How to apply:** Let Vite log and display frontend errors normally. Reserve process termination for genuinely fatal startup failures.
