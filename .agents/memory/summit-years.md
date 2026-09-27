---
name: Summit years data model
description: Decisions behind per-year summit pages, current-summit semantics, and how summit schema changes reach production.
---
- "Current" summit is an explicit admin flag, not derived from dates. A summit whose date has passed but is still flagged current keeps ticket/sponsor CTAs (gate on `isCurrent || !past`).
  **Why:** the 2026 page had to lose nothing after its January date passed; the next year is set up as a draft first.
- Speakers are one profile per person; summit years come from their session assignments. Never duplicate a speaker per year.
- Summit news uses an explicit summit link on posts, not tags. Generic "summit" tags were intentionally not auto-linked.
- Summit schema changes go through a hand-written idempotent SQL file (see replit.md for the production step).
  **Why:** `db:push` would drop tables that live outside the Drizzle schema.
  **How to apply:** add any future summit column to that SQL file, not via push.
