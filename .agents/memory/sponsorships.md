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
- Tier descriptions, display positions and presentation options may be edited globally, including on past Summit pages; names, stable keys and the automatic default remain locked.
  **Why:** On 2026-10-17 the owner expanded the initial add-only scope and confirmed that changes applying everywhere are the whole point of unifying tiers, not an unwanted side effect.
  **How to apply:** Explain the all-years effect in the editor; preserve history and existing sponsor/company links. Keep tests focused, not a broad regression suite or speculative CRM/event work.
- Tier administration must reuse the existing admin table and right-side panel patterns for both creating and editing.
  **Why:** The owner explicitly requested the established Posts/table-and-panel experience rather than an inline tier form or a separate sponsor-system rewrite.
  **How to apply:** Inspect and reuse existing admin components; do not introduce parallel sponsor/company editors.
- Tier editing should show only editable options, not redundant locked name/key inputs, and describe layouts by column count rather than preset nicknames.
  **Why:** The owner found immutable fields cluttered the editor and names such as “Compact” did not explain the layout.
  **How to apply:** Identify the tier in the panel heading, hide internal keys, keep the name input for creation, and label columns by actual sponsors per row.
- Tier display priority must remain independent of the automatic assignment default, and tier creation must never imply annual participation.
  **Why:** The owner needs higher-ranked tiers without silently reclassifying presenting sponsors, changing historical assignments, or adding empty sections to past Summit pages.
  **How to apply:** Keep the existing automatic default explicit; use actual annual sponsorship rows, not catalog membership, to decide public section visibility.
