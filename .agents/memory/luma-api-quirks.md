---
name: Luma API quirks
description: Undocumented behavior of the Luma list-events endpoint that affects what the events table holds.
---
- `calendar/list-events` entries have NO `description` field; only `event/get` returns it (plain `description` and `description_md`). So `events.description` is empty unless fetched per event.
  **Why:** discovered when linking summits to Luma — every synced event had a null description.
  **How to apply:** fetch details only for the few events that need them (summit-linked); keep the list upsert from nulling a fetched description.
- The `created_after` param the sync passes to list-events does not limit results in practice: every sync re-fetches all events, so edits in Luma (dates, venue, cover) land on the next sync.
- `calendar/list-people` also ignores `created_after`, but supports `sort_column=created_at&sort_direction=desc` (verified 2026-10-15; valid columns: created_at, event_checked_in_count, event_approved_count, name, revenue_usd_cents). Use newest-first + early stop for incremental reads.
- `geo_address_json.address` is the place name (e.g. venue), `full_address` usually starts with that name.
