---
name: Summit years data model
description: Decisions behind per-year summit pages, current-summit semantics, and how summit schema changes reach production.
---
- "Current" summit is an explicit admin flag, not derived from dates. A summit whose date has passed but is still flagged current keeps ticket/sponsor CTAs (gate on `isCurrent || !past`).
  **Why:** the 2026 page had to lose nothing after its January date passed; the next year is set up as a draft first.
- Speakers are one profile per person; summit years come from their session assignments. Never duplicate a speaker per year.
- Summit news uses an explicit summit link on posts, not tags. Generic "summit" tags were intentionally not auto-linked.
- Summit schema changes go in the hand-written idempotent SQL files, applied to the DEVELOPMENT database (post-merge re-applies them). Publishing diffs dev schema into production — never hand-run DDL on production.
  **Why:** `db:push` would drop tables that live outside the Drizzle schema; a merge once left dev without the new tables, so the new pages were blank.
- Original hardcoded summit pages are kept at hidden comparison routes until the owner explicitly approves removal.
  **Why:** the owner requires sign-off before removal, and the 2025 layout is not fully reproduced by the generic year page.
- Real summit content lives in production; dev only has sample data. Judge backfill results against production, not dev.
