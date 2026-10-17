---
name: Sponsor / sponsorship model
description: Decisions behind global sponsors with yearly sponsorships, the legacy columns, and the two-stage rollout.
---
- One sponsor record per sponsor (name, logo, link, padding, company). Years and tiers live only on sponsorships. There is deliberately NO per-year logo override.
  **Why:** the owner does not want old logos to linger on past pages after a rebrand.
- General sponsor displays and "Active" status follow the annual calendar year (January through December), independent of which summit is published or featured. Dated summit pages retain their own year's sponsors.
  **Why:** The owner sells upcoming-year sponsorships ahead of the February summit; those must not displace this year's active sponsors early. The owner explicitly requires this across all sponsor displays, not just the directory. There is no prior-year fallback after January 1.
  **How to apply:** Use Sarasota's calendar boundary consistently across clients and server; keep display/count/admin scope separate from summit promotion. Preserve historical year links. Company premium remains eligible for current OR next calendar year.
- The old sponsors.year / sponsors.tier columns are legacy: nullable, never written, read only by the startup data step that converts legacy rows. Drop them only in a later change after production has run the conversion and been verified.
  **Why:** Publish applies schema before the new code's data step runs; dropping them in the same release would lose production's sponsor years.
- Legacy-row detection is "no sponsorship row in ANY state (incl. removed) for the row's own year", so removing a sponsor from a year is never undone by a restart.
- Summit "Presented by" links to a sponsor; old text columns are a fallback only when nothing is linked. Clearing the presenting sponsor also empties the text so the data step can't relink it.
- Sponsor records are intended to evolve into CRM records for fundraising and other actions; the owner wants configurable sponsorship categories as the tightly scoped first phase.
  **Why:** The owner wants versatile sponsor identities and future event-only sponsorships without requiring annual sponsorship or a tier.
  **How to apply:** Keep sponsor identity separate from sponsorship participation and tier classification. Do not expand category work into CRM features or event sponsorship implementation without approval.
- The first configurable-tier phase prioritizes adding new tiers for this year's sponsorships, not modifying or removing old tiers; reuse existing sponsor/company links.
  **Why:** The owner clarified that adding tiers is the immediate need and asked for minimal implementation and only explicitly necessary tests identified during the build.
  **How to apply:** Preserve existing tiers/history, investigate all affected consumers, and avoid bundling broad regression suites or speculative CRM/event infrastructure into this phase.
