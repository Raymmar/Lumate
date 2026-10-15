---
name: Summit years data model
description: Decisions behind per-year summit pages, current-summit semantics, and how summit schema changes reach production.
---
- "Current" summit is an explicit admin flag, not derived from dates. A summit whose date has passed but is still flagged current keeps ticket/sponsor CTAs (gate on `isCurrent || !past`).
  **Why:** the 2026 page had to lose nothing after its January date passed; the next year is set up as a draft first.
- Speakers are one profile per person; summit years come from their session assignments. Never duplicate a speaker per year.
- The general speakers page must default to ALL speakers, with optional visitor-selected year filtering. Never force the featured summit's year.
  **Why:** The owner explicitly rejected hiding past speakers when a new summit is published; the new event can be public before its lineup is ready.
  **How to apply:** Only explicitly dated summit pages scope speakers to their event year. Keep historical session associations unchanged.
- Publishing makes a summit page accessible; featuring it is a separate explicit admin action. Neither may implicitly switch general sponsor/speaker displays or overwrite historical content.
  **Why:** The owner needs upcoming pages live while existing speakers and annual sponsors remain visible elsewhere.
  **How to apply:** Do not derive general-content scope from the featured-event flag, and do not infer a new featured event merely from publication order.
- Summit news uses an explicit summit link on posts, not tags. Generic "summit" tags were intentionally not auto-linked.
- Summit schema changes go in the hand-written idempotent SQL files, applied to the DEVELOPMENT database (post-merge re-applies them). Publishing diffs dev schema into production — never hand-run DDL on production.
  **Why:** `db:push` would drop tables that live outside the Drizzle schema; a merge once left dev without the new tables, so the new pages were blank.
- Original hardcoded summit pages are kept at hidden comparison routes until the owner explicitly approves removal.
  **Why:** the owner requires sign-off before removal, and the 2025 layout is not fully reproduced by the generic year page.
- Real summit content lives in production; dev only has sample data. Judge backfill results against production, not dev.
- Summit hero artwork must stay at its original aspect ratio, full-width and uncropped, with no background fill.
  **Why:** The artwork contains text. The owner accepted unequal image/text panel heights rather than cropping or adding empty bands.
  **How to apply:** Preserve the edge-to-edge layout and rounded right corners; let image height follow its proportions on desktop and mobile.
