import "./_group.css";
import "./CommunityJournal.css";
import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Facebook, Instagram, Linkedin, LogIn, MapPin, Menu, MessageCircle, Play, Search, X } from "lucide-react";
import source from "./_shared/content.json?raw";
import { OriginalTicket } from "./_shared/original/SummitTicketOffer";

type Row = Record<string, any>;
const content = JSON.parse(source) as Row;
const outbound = { target: "_blank", rel: "noopener noreferrer" };
const nav = [["Directory", "/companies"], ["News", "/news"], ["About", "/about"], ["Summit", "/summit"], ["Speakers", "/speakers"]];
const links = [
  ["About Sarasota Tech", "/about"], ["Tech Summit", "/summit"],
  ["Event Calendar", "https://lu.ma/SarasotaTech"],
  ["Get More Involved", "https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM"],
  ["Media Kit", "https://raymmar.notion.site/ST-Media-Kit-1277f5136ac18006aa35c8ccf66ac43a"],
];
const socials = [
  { label: "LinkedIn", Icon: Linkedin, url: "https://www.linkedin.com/company/102671680/admin/feed/posts/" },
  { label: "Facebook", Icon: Facebook, url: "https://www.facebook.com/sarasotatechgroup/" },
  { label: "Instagram", Icon: Instagram, url: "https://www.instagram.com/sarasota.tech/" },
  { label: "WhatsApp", Icon: MessageCircle, url: "https://chat.whatsapp.com/FDBEXC9a5up7PPst5dkGbl" },
];
const personName = (person: Row) => person.fullName || person.userName || person.displayName || "";
const initials = (name: string) => name.split(/\s+/).map(n => n[0]).slice(0, 2).join("");
const personLink = (person: Row) => `/people/${encodeURIComponent(person.slug || String(person.userName || person.fullName || person.api_id).toLowerCase().replace(/\s+/g, "-"))}`;
const postLink = (post: Row) => post.ctaLink || `/post/${String(post.title || "").replace(/\./g, "").replace(/&/g, "and").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, " ").toLowerCase().trim().replace(/\s+/g, "-") || `p-${post.id}`}`;
function dateLabel(value: string, event = false) {
  if (!value) return "";
  const parsed = new Date(event && !/Z|[+-]\d{2}:?\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" };
  if (event) Object.assign(options, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return parsed.toLocaleString("en-US", options);
}
function Avatar({ person }: { person: Row }) {
  const [failed, setFailed] = useState(false);
  return person.avatarUrl && !failed
    ? <img className="cj-avatar" src={person.avatarUrl} alt={personName(person)} onError={() => setFailed(true)} />
    : <span className="cj-avatar" aria-hidden>{initials(personName(person))}</span>;
}
function Person({ person }: { person: Row }) {
  const count = person.eventCount ?? person.stats?.totalEventsAttended;
  return <a className="cj-person" href={personLink(person)} {...outbound}>
    <Avatar person={person} /><div className="cj-person-copy"><strong>{personName(person)}</strong><small>{person.jobTitle || person.companyName || (count != null ? `${count} events attended` : "")}</small></div>
  </a>;
}

export function CommunityJournal() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [peopleLimit, setPeopleLimit] = useState(8);
  const [tier, setTier] = useState("All");
  const [showAllSponsors, setShowAllSponsors] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const posts: Row[] = content.posts ?? [];
  const pinned = posts.filter(post => post.isPinned && !post.membersOnly);
  const leading = pinned.length ? pinned : posts.filter(post => !post.membersOnly);
  const story = leading[storyIndex % Math.max(1, leading.length)];
  const news = posts.filter(post => post.id !== story?.id).slice(0, 2);
  const events: Row[] = content.upcomingEvents ?? [];
  const next = events[0];
  const people: Row[] = content.people ?? [];
  const featured: Row | undefined = content.featuredMember?.userName || content.featuredMember?.fullName ? content.featuredMember : people[0];
  const filteredPeople = useMemo(() => people.filter(person =>
    [personName(person), person.companyName, person.jobTitle].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())), [people, query]);
  const sponsors: Row[] = content.sponsors ?? [];
  const tiers = ["All", ...new Set(sponsors.map(sponsor => sponsor.tier).filter(Boolean))];
  const filteredSponsors = sponsors.filter(sponsor => tier === "All" || sponsor.tier === tier);
  const stats = content.stats ?? {};
  const introPost = posts.find(post => post.title === "Sarasota Tech Intro") || posts.find(post => post.title?.includes("Season 3"));

  return <div className="community-home cj-restart" id="home">
    <header className="cj-nav">
      <div className="cj-shell cj-nav-inner">
        <a href="#home" aria-label="Sarasota Tech home"><img className="cj-logo" src={content.logo} alt="Sarasota Tech" /></a>
        <button className="cj-button cj-mobile-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <nav className={`cj-nav-links ${menuOpen ? "cj-open" : ""}`} aria-label="Main navigation">{nav.map(([label, href]) => <a key={label} href={href} {...outbound}>{label}</a>)}</nav>
        <div className="cj-account"><a className="cj-button cj-button-dark" href="/memberships" {...outbound}>Join Us</a><a className="cj-button cj-button-dark" href="/login" {...outbound}><LogIn size={14} />Log in</a></div>
      </div>
    </header>
    <main className="cj-shell">
      <div onClick={event => {
        const target = (event.target as HTMLElement).closest("a,button");
        if (target?.getAttribute("data-testid") === "button-buy-summit-ticket") window.open("/memberships", "_blank", "noopener,noreferrer");
        if (target?.getAttribute("href") === "#summit") {
          event.preventDefault();
          window.open(`/summit/${content.summit.year}`, "_blank", "noopener,noreferrer");
        }
      }}><OriginalTicket summit={content.summit} /></div>

      <div className="cj-main-grid">
        <section className="cj-news" id="news">
          <div className="cj-section-head"><h2>Community News</h2><div className="flex items-center gap-3"><a href="/news" {...outbound}>View all <ArrowUpRight size={13} /></a>{leading.length > 1 && <div className="flex gap-1"><button className="cj-button" aria-label="Previous pinned story" onClick={() => setStoryIndex((storyIndex + leading.length - 1) % leading.length)}><ChevronLeft size={14} /></button><button className="cj-button" aria-label="Next pinned story" onClick={() => setStoryIndex((storyIndex + 1) % leading.length)}><ChevronRight size={14} /></button></div>}</div></div>
          {story ? <a className="cj-feature-story" href={postLink(story)} {...outbound}>
            {story.featuredImage && <img src={story.featuredImage} alt={story.title} />}
            <div className="cj-feature-copy">{story.tags?.[0] && <span className="cj-tag">{story.tags[0]}</span>}<h3>{story.title}</h3><p>{story.summary}</p><span className="cj-read">Read More <ArrowUpRight size={13} /></span></div>
          </a> : <p className="cj-empty">No posts available.</p>}
          <div className="cj-story-list">{news.map(post => <a key={post.id} className="cj-story-row" href={post.membersOnly ? "/memberships" : postLink(post)} {...outbound}>
            {post.featuredImage ? <img src={post.featuredImage} alt="" /> : <span />}
            <div><h3>{post.title}</h3><p>{post.membersOnly ? "Members Only" : dateLabel(post.createdAt)}</p></div><ArrowUpRight size={14} />
          </a>)}</div>
        </section>
        <aside className="cj-events" id="events">
          <div className="cj-section-head"><h2>Event Calendar</h2><a href="https://lu.ma/SarasotaTech" {...outbound}><ExternalLink size={13} /></a></div>
          {next ? <article className="cj-event">
            <a href={next.url} {...outbound}>{next.coverUrl && <img src={next.coverUrl} alt={next.title} />}</a>
            <div><h3><a href={next.url} {...outbound}>{next.title}</a></h3><p><CalendarDays size={13} />{dateLabel(next.startTime, true)}</p><p><MapPin size={13} />{next.location?.venue_name || next.location?.full_address}</p><div className="cj-event-actions"><a className="cj-button cj-button-dark" href={next.url} {...outbound}>RSVP <ArrowUpRight size={12} /></a></div></div>
          </article> : <p className="cj-empty">No upcoming events available at the moment.</p>}
          {events.slice(1, 4).map(event => <a className="cj-more-event" key={event.id || event.api_id} href={event.url} {...outbound}><CalendarDays size={18} /><div><strong>{event.title}</strong><span>{dateLabel(event.startTime, true)}</span></div><ArrowUpRight size={13} /></a>)}
          {featured && <div className="cj-member-feature"><h3>Featured Member</h3><Person person={featured} />{featured.bio && <p>{featured.bio}</p>}</div>}
        </aside>
      </div>

      <section className="cj-directory" id="directory">
        <div className="cj-section-head"><h2>People</h2><label className="cj-search"><Search size={15} /><input value={query} onChange={event => { setQuery(event.target.value); setPeopleLimit(8); }} placeholder="Search members..." aria-label="Search members" /></label></div>
        <div className="cj-people-grid">{filteredPeople.slice(0, peopleLimit).map(person => <Person key={person.id || person.api_id} person={person} />)}</div>
        {!filteredPeople.length && <p className="cj-empty">No members found.</p>}
        <div className="cj-directory-bottom"><span>{query ? filteredPeople.length : content.peopleTotal ?? people.length} members</span>{filteredPeople.length > peopleLimit && <button className="cj-text-button" onClick={() => setPeopleLimit(peopleLimit + 8)}>Load more <ChevronRight size={13} /></button>}</div>
      </section>

      <section className="cj-sponsors" id="sponsors">
        <div className="cj-section-head"><h2>Our Sponsors</h2><a className="cj-button" href="/memberships" {...outbound}>Become a Sponsor <ArrowUpRight size={13} /></a></div>
        <div className="cj-sponsor-filters" aria-label="Sponsor tiers">{tiers.map(value => <button key={value} aria-pressed={tier === value} onClick={() => { setTier(value); setShowAllSponsors(false); }}>{value}</button>)}</div>
        <div className="cj-sponsor-grid">{filteredSponsors.slice(0, showAllSponsors ? undefined : 7).map(sponsor => <a key={sponsor.id} href={sponsor.url} {...outbound} className="cj-sponsor" aria-label={sponsor.name}><img src={sponsor.logo} alt={sponsor.name} style={{ padding: Math.min(Number(sponsor.logoPadding) || 0, 8) }} /><span>{sponsor.tier}</span></a>)}</div>
        {filteredSponsors.length > 7 && <button className="cj-text-button mt-3" onClick={() => setShowAllSponsors(!showAllSponsors)}>{showAllSponsors ? "Show less" : "View all"} <ChevronRight size={13} /></button>}
      </section>

      <section className="cj-community" id="about">
        <div><h2>Sarasota Tech Intro</h2><a className="cj-video" href="https://www.youtube.com/watch?v=JMy4CmxWMlE" {...outbound} aria-label="Watch Sarasota Tech video">{introPost?.featuredImage && <img src={introPost.featuredImage} alt={introPost.title} />}<span className="cj-play"><Play fill="currentColor" size={18} /></span></a></div>
        <div id="membership"><h2>Sarasota.Tech</h2><p>We're connecting Sarasota's tech community and driving the city forward.</p><form className="cj-subscribe" onSubmit={event => { event.preventDefault(); setSubscribed(true); }}><input required type="email" placeholder="Email" aria-label="Email address" /><button className="cj-button cj-button-dark" type="submit">Subscribe</button></form><p className="mt-3" role={subscribed ? "status" : undefined}>{subscribed ? "Preview only — no invitation or email was sent." : "Enter your email for an invite to our next event along with occasional updates about our growing community."}</p></div>
        <div><h2>Links</h2><div className="cj-link-list">{links.map(([label, href]) => <a key={label} href={href} {...outbound}>{label}<ArrowUpRight size={12} /></a>)}</div></div>
      </section>
      <section className="cj-statbar" aria-label="Community statistics">{[
        ["Events", stats.events, "Since August 2023"],
        ["Tickets", stats.totalAttendees, "Total event attendance"],
        ["Subscribers", stats.uniqueAttendees, "68% open rate 23% click rate"],
      ].map(([label, value, detail]) => <div className="cj-stat" key={label}><b>{Number(value ?? 0).toLocaleString()}</b><div><strong>{label}</strong><span>{detail}</span></div></div>)}</section>
      <footer className="cj-footer"><div className="cj-footer-links">{nav.map(([label, href]) => <a key={label} href={href} {...outbound}>{label}</a>)}<a href="/settings" {...outbound}>Settings</a></div><div className="cj-socials">{socials.map(({ label, Icon, url }) => <a key={label} href={url} {...outbound} aria-label={label}><Icon size={15} /></a>)}<a href="https://twitter.com/SarasotaTech" {...outbound} aria-label="X (Twitter)">X</a></div></footer>
    </main>
  </div>;
}
