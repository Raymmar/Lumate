# Original community home extraction

The extracted Summit ticket is in `SummitTicketOffer.tsx` and exports
`OriginalTicket` (the reusable home-page wrapper) and `SummitTicketOffer`
(the copied ticket offer). `OriginalTicket` accepts optional `state="buy" |
"claim" | "dismissed"`; dismissing it locally never writes a cookie or contacts
the application. Checkout, claim, and learn-more controls are kept sandbox-safe.

The extracted entry tree is `Dashboard.tsx` → `DashboardLayout.tsx` →
`BulletinBoard.tsx`. It preserves the source container, nav/ticket/sidebar order,
and bulletin section order; `NavBar.tsx` and `HomeSections.tsx` carry the
visual dependencies with sandbox-safe anchor navigation and public fixture data.
The checked-in parent fixture at `../content.json` is the only data source.

Auth, API queries, post writes, RSVP, claim registration, and email delivery
are stubbed. The membership form only confirms locally; event RSVP is a local
visual toggle. Only the single future event in the fixture is shown. The
YouTube area is a static preview rather than an external iframe so this
extraction does not contact services. The public read-only ticket price is
shown as $250/year.
