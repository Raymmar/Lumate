# Home page exploration brief

## Product identity
Sarasota Tech is the place where local builders, founders, and curious neighbors
meet in real life and discover one another online. It should feel recognizably
local, welcoming, and ambitious—not like an administrative dashboard.

## What exists and why
The current home composes DashboardLayout and BulletinBoard. DashboardLayout is
also used by directory, news, speakers, and many utility/profile pages. It owns
sticky navigation, the shared ticket slot, and the event/people sidebar.
About and Summit use their own shells. This is a homepage-only exploration:
changing the shared sidebar globally would unintentionally change other pages.

The existing content inventory is navigation/account actions, the original
full-width temporary Summit ticket, upcoming public events with RSVP/calendar
actions, searchable people and profile links, pinned community stories and news,
members-only content or join prompt, community introduction video, featured
member, sponsors with tiers and original logo proportions, statistics, social
links, calendar, get-involved and media-kit links.

## Fixed constraints
- Do not edit the application or any database. All work stays in the sandbox.
- Use the extracted real components as the starting point, not approximations.
- Reuse OriginalTicket from _shared/original/SummitTicketOffer.tsx unchanged.
  Pass content.summit. The asset, prominent full-width placement below navigation,
  local dismiss action, price/renewal disclosure, and annual-page Learn more stay.
  Actual coupon eligibility, subscription, expiry, and seven-day dismissal
  belong to the existing live hooks if a design is later implemented.
- Keep core routes one click away: /companies, /news, /about, /summit, /speakers,
  /memberships, /login, /settings; /people/:slug and /post/:title for details.
  Use real existing routes, no invented /events or /sponsors pages.
- The user wants next event plus next few events clearly discoverable, people
  directory beneath events, stronger news/storytelling, featured members and
  sponsors, and stats lower near the footer.
- Public fixture _shared/content.json is the source of truth. It currently has
  only ONE upcoming event. Do not mislabel past meetups as upcoming or invent
  future events/dates/locations. Explain sparse scheduling honestly and provide
  the existing https://lu.ma/SarasotaTech calendar action. Designs should scale
  to multiple scheduled records using the same event shape.
- Use real public member names/photos and sponsor logos from the fixture.
  Sponsor logos must be object-contain, never cropped, with tier distinctions.
- Show public/member content gating honestly. Do not invent active subscriptions,
  issued coupons, endorsements, new features, or inflated numbers.
- Exploration is interactive but safe: local search, show-more, menu, ticket
  dismissal and content dialogs work locally; external destinations open new
  tabs. No checkout, RSVP, email, analytics, auth, or database mutations.
- Responsive, accessible buttons, keyboard focus, readable contrast, reduced
  motion support. No emojis. Do not edit global index.css.

## Meaningful variation axes
1. Hierarchy: story-led community identity versus immediate event/member discovery.
2. Structure: composed reading experience versus fast, browseable community hub.
3. Feeling: confident local publication versus energetic real-world gathering.

These change the way content is understood, not just the colors.

## Version 1 — Community Journal
Hypothesis: a stronger sense of local stories and people makes joining the
community feel meaningful. Bring real community imagery and editorial storytelling
forward, while making the next gathering and the people behind the stories easy
to reach. Feels confident, warm, and worth reading, not corporate or generic.
Trade-off: more narrative and breathing room, less simultaneous information.

## Version 2 — Community Discovery
Hypothesis: making it exceptionally easy to discover a gathering, a person, and
a local organization gives returning visitors a reason to browse. Feels lively,
inventive, and distinctly Sarasota, with a stronger sense of activity and
participation rather than a long publication page.
Trade-off: faster exploration and richer interactions, slightly busier than the
story-first option.

## Delivery
Two standalone, scrollable, independently implemented homepage variants.
The Current reference stays unchanged. Each variant should be a distinct design
hypothesis, not a reskin. Use only local public assets already downloaded into
artifacts/mockup-sandbox/public/images/ and reference /__mockup/images/...
The original ticket also has a bundled extracted image; keep its import unchanged.
Copy source structures into the variant as needed; do not import main app code.
Use separate scoped variant CSS files and import ./_group.css as the baseline.
Keep the canvas frames desktop-sized; make the page responsive inside them.
