---
name: Sponsor / sponsorship model
description: Decisions behind global sponsors with yearly sponsorships, the legacy columns, and the two-stage rollout.
---
- One sponsor record per sponsor (name, logo, link, padding, company). Years and tiers live only on sponsorships. There is deliberately NO per-year logo override.
  **Why:** the owner does not want old logos to linger on past pages after a rebrand.
- "Active" sponsor = has a sponsorship for the current summit year (computed, never a flag). Company premium uses current OR next calendar year, as before.
- The old sponsors.year / sponsors.tier columns are legacy: nullable, never written, read only by the startup data step that converts legacy rows. Drop them only in a later change after production has run the conversion and been verified.
  **Why:** Publish applies schema before the new code's data step runs; dropping them in the same release would lose production's sponsor years.
- Legacy-row detection is "no sponsorship row in ANY state (incl. removed) for the row's own year", so removing a sponsor from a year is never undone by a restart.
- Summit "Presented by" links to a sponsor; old text columns are a fallback only when nothing is linked. Clearing the presenting sponsor also empties the text so the data step can't relink it.
