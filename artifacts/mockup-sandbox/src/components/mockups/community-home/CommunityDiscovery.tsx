import "./_group.css";
import "./_discovery.css";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Instagram,
  Linkedin,
  MapPin,
  Menu,
  Search,
  X,
  Youtube,
} from "lucide-react";
import { OriginalTicket } from "./_shared/original/SummitTicketOffer";
import content from "./_shared/content.json";

type RecordData = Record<string, any>;

const people = content.people as RecordData[];
const posts = content.posts as RecordData[];
const sponsors = content.sponsors as RecordData[];
const events = content.upcomingEvents as RecordData[];
const navLinks = [
  ["Companies", "/companies"],
  ["News", "/news"],
  ["About", "/about"],
  ["Summit", "/summit"],
  ["Speakers", "/speakers"],
];
const extendedLinks = [
  ["Memberships", "/memberships"],
  ["Log in", "/login"],
  ["Settings", "/settings"],
];
const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/sarasota.tech/", Icon: Instagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/102671680/admin/feed/posts/", Icon: Linkedin },
  { label: "YouTube", href: "https://www.youtube.com/@SarasotaTech", Icon: Youtube },
];
const outside = { target: "_blank", rel: "noopener noreferrer" };
const safeText = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
const personName = (person: RecordData) => safeText(person.fullName || person.userName || person.name || "Community member");
const postDate = (value: string) => {
  if (!value) return "Community update";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Community update"
    : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const eventDateParts = (value: string) => {
  const day = value?.slice(0, 10);
  const date = day ? new Date(`${day}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return { month: "TBA", day: "—", full: "Date to be announced" };
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    day: date.toLocaleDateString("en-US", { day: "numeric" }),
    full: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
};
const bodyText = (body: string) =>
  safeText(body?.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|h[1-6])>/gi, "\n\n").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " "));
const profileHref = (person: RecordData) =>
  person.slug || person.id || person.api_id ? `/people/${encodeURIComponent(String(person.slug || person.id || person.api_id))}` : "/companies";

function ExternalRoute({ href, children, className = "", ...props }: { href: string; children: React.ReactNode; className?: string; [key: string]: any }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>{children}</a>;
}

function CommunityDiscovery() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [peopleCount, setPeopleCount] = useState(10);
  const [newsCount, setNewsCount] = useState(3);
  const [allSponsors, setAllSponsors] = useState(false);
  const [tierFilter, setTierFilter] = useState("All");
  const [activePost, setActivePost] = useState<RecordData | null>(null);
  const [toast, setToast] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPeople = useMemo(
    () => people.filter((person) => `${personName(person)} ${safeText(person.bio)}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );
  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [],
  );
  const filteredPosts = useMemo(
    () => sortedPosts.filter((post) => `${safeText(post.title)} ${safeText(post.summary)} ${(post.tags || []).join(" ")}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery, sortedPosts],
  );
  const filteredSponsors = useMemo(
    () => sponsors.filter((sponsor) =>
      (tierFilter === "All" || sponsor.tier === tierFilter) &&
      `${safeText(sponsor.name)} ${safeText(sponsor.tier)}`.toLowerCase().includes(normalizedQuery),
    ),
    [normalizedQuery, tierFilter],
  );
  const visiblePeople = filteredPeople.slice(0, peopleCount);
  const tiers = ["All", ...Array.from(new Set(sponsors.map((sponsor) => sponsor.tier).filter(Boolean)))];
  const visibleSponsors = allSponsors ? filteredSponsors : filteredSponsors.slice(0, 6);
  const featuredPost = sortedPosts.find((post) => post.isPinned && !post.membersOnly);
  const newsItems = filteredPosts.filter((post) => post.id !== featuredPost?.id);
  const visiblePosts = newsItems.slice(0, newsCount);
  const introVideo = posts.find((post) => safeText(post.title).toLowerCase() === "sarasota tech intro" && post.videoUrl);
  const featuredMember = content.featuredMember as RecordData;
  const upcomingEvent = events[0];
  const eventDate = upcomingEvent ? eventDateParts(upcomingEvent.startTime) : null;
  const location = upcomingEvent?.location?.venue_name || upcomingEvent?.location?.full_address || "Sarasota, Florida";

  useEffect(() => {
    if (!activePost) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePost(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activePost]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const openPost = (post: RecordData) => {
    setActivePost(post);
  };

  const showMorePeople = () => {
    setPeopleCount((count) => count + 10);
    setToast("More local profiles, ready to explore.");
  };

  const showMoreNews = () => {
    setNewsCount((count) => count + 4);
  };

  const memberProfile = (person: RecordData) => (
    <ExternalRoute className="cd-person" href={profileHref(person)} key={person.id || person.api_id || person.slug}>
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" loading="lazy" />
      ) : (
        <span className="cd-avatar-fallback" aria-hidden="true">{personName(person).slice(0, 1).toUpperCase()}</span>
      )}
      <span className="cd-person-detail">
        <span className="cd-person-name">{personName(person)}</span>
        <span className="cd-person-note">{safeText(person.bio).slice(0, 54) || "Sarasota Tech member"}</span>
      </span>
    </ExternalRoute>
  );

  const newsCard = (post: RecordData) => (
    <button className="cd-news-item" key={post.id} onClick={() => openPost(post)} aria-label={`Read ${safeText(post.title)}`}>
      <span className="cd-news-thumb">
        {post.featuredImage && <img src={post.featuredImage} alt="" loading="lazy" />}
      </span>
      <span>
        <span className="cd-news-meta">{postDate(post.createdAt)}{post.category ? ` · ${safeText(post.category)}` : ""}</span>
        <span className="cd-news-title">
          {safeText(post.title)}
          {post.membersOnly && <span className="cd-locked-tag">Members</span>}
        </span>
        <span className="cd-news-summary">{safeText(post.summary)}</span>
      </span>
      <ChevronRight className="cd-news-arrow" size={18} aria-hidden="true" />
    </button>
  );

  return (
    <div className="community-home community-discovery" id="home">
      <header className="cd-topbar">
        <div className="cd-wrap cd-nav">
          <ExternalRoute href="/" className="cd-brand" aria-label="Sarasota Tech home">
            <img src={content.logo} alt="" />
            <span className="cd-brand-copy">
              <span className="cd-brand-name">Sarasota Tech</span>
              <span className="cd-brand-place">Local minds, building forward</span>
            </span>
          </ExternalRoute>
          <nav className="cd-navlinks" aria-label="Main navigation">
            {navLinks.map(([label, href]) => <ExternalRoute href={href} key={href}>{label}</ExternalRoute>)}
          </nav>
          <div className="cd-nav-actions">
            <ExternalRoute className="cd-pill-link cd-pill-dark cd-settings" href="/settings">Member space</ExternalRoute>
            <ExternalRoute className="cd-pill-link cd-button-coral" href="/memberships">Join us <ArrowUpRight size={14} /></ExternalRoute>
            <button className="cd-menu" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="cd-nav-menu cd-wrap" aria-label="More destinations">
            {[...navLinks, ...extendedLinks].map(([label, href]) => (
              <ExternalRoute href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</ExternalRoute>
            ))}
            <ExternalRoute href="/companies" onClick={() => setMenuOpen(false)}>People directory</ExternalRoute>
          </nav>
        )}
      </header>

      <div className="cd-ticket-area cd-wrap" id="summit">
        <OriginalTicket summit={content.summit} />
      </div>

      <section className="cd-discover-hero" aria-labelledby="cd-hero-title">
        <div className="cd-wrap cd-hero-content">
          <div>
            <div className="cd-kicker">Sarasota, Florida · A community in motion</div>
            <h1 className="cd-display" id="cd-hero-title">Find your next<br /><em>good room.</em></h1>
            <p className="cd-hero-copy">Meet the people making things here. Find a gathering, follow a bright idea, and see who is helping Sarasota move forward.</p>
          </div>
          <div className="cd-searchbox">
            <label className="cd-searchlabel" htmlFor="discovery-search">Search the local network</label>
            <div className="cd-searchfield">
              <Search size={17} aria-hidden="true" />
              <input id="discovery-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPeopleCount(10); setNewsCount(3); }} placeholder="People, stories, organizations" />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}
            </div>
            <div className="cd-searchhint"><span>Explore what is happening around town</span><strong>{people.length} profiles</strong></div>
          </div>
        </div>
      </section>

      <main className="cd-wrap cd-main">
        <section className="cd-section" id="events" aria-labelledby="cd-events-title">
          <div className="cd-section-head">
            <div>
              <div className="cd-eyebrow">Get in the room</div>
              <h2 className="cd-section-title" id="cd-events-title">Next up in Sarasota</h2>
              <p className="cd-section-sub">{events.length ? "The next scheduled public gathering, straight from the community calendar." : "No public gatherings are scheduled in the current calendar."}</p>
            </div>
            <ExternalRoute href="https://lu.ma/SarasotaTech" className="cd-text-link">Open the full calendar <ArrowUpRight size={15} /></ExternalRoute>
          </div>
          {upcomingEvent && eventDate ? (
            <div className="cd-events-grid">
              <article className="cd-event-feature">
                <div className="cd-event-art">
                  {upcomingEvent.coverUrl && <img src={upcomingEvent.coverUrl} alt="" />}
                  <div className="cd-date-stamp" aria-label={eventDate.full}><span>{eventDate.month}</span><span>{eventDate.day}</span></div>
                </div>
                <div className="cd-event-copy">
                  <span className="cd-event-tag">Upcoming · Sarasota Tech</span>
                  <h3 className="cd-event-name">{safeText(upcomingEvent.title)}</h3>
                  <div className="cd-event-meta"><CalendarDays size={15} /><span>{eventDate.full}</span></div>
                  <div className="cd-event-meta"><MapPin size={15} /><span>{safeText(location)}</span></div>
                  <div className="cd-event-actions">
                    <ExternalRoute className="cd-button cd-button-coral" href={upcomingEvent.url}>Event details <ArrowUpRight size={14} /></ExternalRoute>
                    <ExternalRoute className="cd-button cd-button-outline" href="https://lu.ma/SarasotaTech"><CalendarDays size={14} /> Calendar</ExternalRoute>
                  </div>
                </div>
              </article>
              <aside className="cd-calendar-note">
                <div>
                  <span className="cd-calendar-symbol"><CalendarDays size={19} /></span>
                  <h3>One date on the board. More when they are real.</h3>
                  <p>There is one upcoming public meetup listed right now. We will share new dates here as they are confirmed—no placeholder events, just the next reason to get together.</p>
                </div>
                <ExternalRoute className="cd-button cd-button-outline" href="https://lu.ma/SarasotaTech">Follow the calendar <ArrowUpRight size={14} /></ExternalRoute>
              </aside>
            </div>
          ) : (
            <div className="cd-empty">No upcoming public meetups are listed yet. Check the community calendar for confirmed dates.</div>
          )}
        </section>

        <section className="cd-section cd-people-section" id="directory" aria-labelledby="cd-people-title">
          <div className="cd-section-head">
            <div>
              <div className="cd-eyebrow">The people behind the work</div>
              <h2 className="cd-section-title" id="cd-people-title">Meet your neighbors</h2>
              <p className="cd-section-sub">Builders, founders, and curious neighbors—start with a name and see where the conversation goes.</p>
            </div>
            <div className="cd-browse-controls">
              <label className="cd-inline-search">
                <span className="cd-sr-only">Filter community members</span>
                <Search size={15} aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPeopleCount(10); setNewsCount(3); }} placeholder="Find a person" />
              </label>
            </div>
          </div>
          {visiblePeople.length ? (
            <div className="cd-people-grid">{visiblePeople.map(memberProfile)}</div>
          ) : (
            <div className="cd-empty">No local profiles match “{query}”. Try a different name or clear your search.</div>
          )}
          <div className="cd-directory-foot">
            <span>Showing {visiblePeople.length} of {filteredPeople.length} profiles in this public directory</span>
            {peopleCount < filteredPeople.length && <button className="cd-show-more" type="button" onClick={showMorePeople}>Show more people <ChevronDown size={13} /></button>}
            <ExternalRoute className="cd-text-link" href="/companies">Explore all members <ArrowUpRight size={14} /></ExternalRoute>
          </div>
        </section>

        <section className="cd-section cd-community-grid" aria-label="Community news and organizations">
          <div id="news">
            <div className="cd-section-head">
              <div>
                <div className="cd-eyebrow">Signals from the scene</div>
                <h2 className="cd-section-title">What is moving</h2>
                <p className="cd-section-sub">Fresh notes, announcements, and stories from the Sarasota Tech community.</p>
              </div>
              <ExternalRoute className="cd-text-link" href="/news">All news <ArrowUpRight size={14} /></ExternalRoute>
            </div>
            <div className="cd-news-list">
              {featuredPost && (!normalizedQuery || `${safeText(featuredPost.title)} ${safeText(featuredPost.summary)}`.toLowerCase().includes(normalizedQuery)) && newsCard(featuredPost)}
              {visiblePosts.map(newsCard)}
              {!featuredPost && !visiblePosts.length && <div className="cd-empty">No community stories match this search.</div>}
              {featuredPost && visiblePosts.length === 0 && normalizedQuery && <div className="cd-empty">No community stories match this search.</div>}
            </div>
            <div className="cd-news-foot">
              {newsCount < newsItems.length && <button className="cd-button cd-button-outline" type="button" onClick={showMoreNews}>Show more stories <ArrowRight size={14} /></button>}
            </div>
          </div>

          <aside className="cd-orgs" id="organizations">
            <div className="cd-org-head">
              <div>
                <div className="cd-eyebrow">The local ecosystem</div>
                <h2 className="cd-org-title">Backers & builders</h2>
                <p className="cd-org-copy">Organizations that make this community possible.</p>
              </div>
              <ExternalRoute className="cd-text-link" href="/companies" aria-label="Browse local companies"><ArrowUpRight size={17} /></ExternalRoute>
            </div>
            <div className="cd-filter-line" aria-label="Filter organizations by supporter tier">
              {tiers.map((tier) => (
                <button className="cd-filter" type="button" key={tier} aria-pressed={tierFilter === tier} onClick={() => setTierFilter(tier)}>{tier}</button>
              ))}
            </div>
            {visibleSponsors.length ? (
              <div className="cd-sponsor-row">
                {visibleSponsors.map((sponsor) => (
                  <ExternalRoute className="cd-sponsor" href={sponsor.url || "/companies"} key={sponsor.id}>
                    {sponsor.logo && <img src={sponsor.logo} alt={safeText(sponsor.name)} loading="lazy" />}
                    <span className="cd-sponsor-name">{safeText(sponsor.name)}</span>
                  </ExternalRoute>
                ))}
              </div>
            ) : (
              <div className="cd-empty">No organizations match this search and tier.</div>
            )}
            <div className="cd-org-foot">
              <span>{filteredSponsors.length} listed · logos shown in their original proportions</span>
              {filteredSponsors.length > 6 && <button type="button" className="cd-show-more" onClick={() => setAllSponsors((show) => !show)}>{allSponsors ? "Show fewer" : "See all"} <ChevronDown size={13} /></button>}
            </div>
          </aside>
        </section>

        <section className="cd-section" aria-label="Stories and member spotlight">
          <div className="cd-section-head">
            <div>
              <div className="cd-eyebrow">A closer look</div>
              <h2 className="cd-section-title">The people, not just the pitch</h2>
            </div>
          </div>
          <div className="cd-below-grid">
            <ExternalRoute className="cd-video-card" href={introVideo?.videoUrl || "https://www.youtube.com/@SarasotaTech"}>
              {introVideo?.featuredImage && <img src={introVideo.featuredImage} alt="" loading="lazy" />}
              <div className="cd-video-copy">
                <span className="cd-play"><Youtube size={20} /></span>
                <h3>Sarasota Tech Intro</h3>
                <p>A short introduction to the community, told by the people building it.</p>
              </div>
            </ExternalRoute>
            <article className="cd-featured-member">
              <div className="cd-featured-top"><span>Member spotlight</span><span>From the directory</span></div>
              <div>
                <div className="cd-featured-person">
                  {featuredMember.avatarUrl ? <img src={featuredMember.avatarUrl} alt="" loading="lazy" /> : <span className="cd-avatar-fallback">{personName(featuredMember).slice(0, 1)}</span>}
                  <div><h3>{personName(featuredMember)}</h3><p>Part of Sarasota Tech</p></div>
                </div>
                {featuredMember.bio && <p className="cd-featured-bio">{safeText(featuredMember.bio)}</p>}
              </div>
              <ExternalRoute className="cd-text-link" href={profileHref(featuredMember)}>Find more members <ArrowUpRight size={14} /></ExternalRoute>
            </article>
          </div>
        </section>

        <section className="cd-section cd-membership" id="membership" aria-label="Get involved">
          <div>
            <div className="cd-eyebrow">There is room at the table</div>
            <h3>Make Sarasota a place to build.</h3>
            <p>Meet people in person, share what you are learning, and help shape a more connected local tech scene.</p>
          </div>
          <div className="cd-membership-actions">
            <ExternalRoute className="cd-button cd-button-dark" href="/memberships">Explore membership <ArrowUpRight size={14} /></ExternalRoute>
            <ExternalRoute className="cd-button cd-button-outline" href="https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM">Get involved <ArrowUpRight size={14} /></ExternalRoute>
          </div>
        </section>
      </main>

      <footer className="cd-footer">
        <div className="cd-wrap">
          <div className="cd-stat-line" aria-label="Sarasota Tech community statistics">
            <div className="cd-stat"><strong>{Number(content.stats.events).toLocaleString()}</strong><span>community events<br />since August 2023</span></div>
            <div className="cd-stat"><strong>{Number(content.stats.totalAttendees).toLocaleString()}</strong><span>total event<br />attendances</span></div>
            <div className="cd-stat"><strong>{Number(content.stats.uniqueAttendees).toLocaleString()}</strong><span>individual people<br />in the community</span></div>
          </div>
          <div className="cd-footer-bottom">
            <ExternalRoute className="cd-footer-brand" href="/">Sarasota Tech</ExternalRoute>
            <nav className="cd-footer-nav" aria-label="Footer links">
              {[...navLinks, ...extendedLinks].map(([label, href]) => <ExternalRoute href={href} key={href}>{label}</ExternalRoute>)}
              <ExternalRoute href="https://raymmar.notion.site/ST-Media-Kit-1277f5136ac18006aa35c8ccf66ac43a">Media kit</ExternalRoute>
              <ExternalRoute href="https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM">Get involved</ExternalRoute>
              <ExternalRoute href="https://lu.ma/SarasotaTech">Calendar</ExternalRoute>
            </nav>
            <div className="cd-socials">
              {socialLinks.map(({ label, href, Icon }) => <ExternalRoute href={href} key={label} aria-label={label}><Icon size={14} /></ExternalRoute>)}
            </div>
          </div>
        </div>
      </footer>

      {activePost && (
        <div className="cd-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivePost(null); }}>
          <section className="cd-dialog" role="dialog" aria-modal="true" aria-labelledby="cd-story-title">
            <button className="cd-dialog-close" type="button" aria-label="Close story" onClick={() => setActivePost(null)}><X size={17} /></button>
            <div className="cd-eyebrow">{activePost.membersOnly ? "Member story" : "Community story"} · {postDate(activePost.createdAt)}</div>
            <h2 id="cd-story-title">{safeText(activePost.title)}</h2>
            <p className="cd-dialog-summary">{safeText(activePost.summary)}</p>
            {activePost.membersOnly ? (
              <div className="cd-dialog-body">This story is for Sarasota Tech members. Sign in to continue, or explore membership to see how to take part.</div>
            ) : (
              <div className="cd-dialog-body">{bodyText(activePost.body || activePost.summary)}</div>
            )}
            <div className="cd-dialog-actions">
              {activePost.membersOnly ? (
                <>
                  <ExternalRoute className="cd-button cd-button-dark" href="/login">Sign in <ArrowUpRight size={14} /></ExternalRoute>
                  <ExternalRoute className="cd-button cd-button-outline" href="/memberships">Membership details</ExternalRoute>
                </>
              ) : (
                <ExternalRoute className="cd-button cd-button-dark" href={`/post/${encodeURIComponent(String(activePost.title || activePost.id))}`}>Open full story <ArrowUpRight size={14} /></ExternalRoute>
              )}
              <button className="cd-button cd-button-outline" type="button" onClick={() => setActivePost(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
      {toast && <div className="cd-toast" role="status">{toast}</div>}
    </div>
  );
}

export { CommunityDiscovery };
export default CommunityDiscovery;
