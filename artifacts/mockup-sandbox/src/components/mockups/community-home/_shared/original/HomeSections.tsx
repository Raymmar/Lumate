import { useEffect, useMemo, useState } from "react";
import {
  Calendar, CalendarDays, ChevronLeft, ChevronRight, Facebook,
  Crown, ExternalLink, ImageIcon, Instagram, Linkedin, Lock, MessageCircle, Search, Ticket, Twitter, UserPlus, Youtube,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type Row = Record<string, any>;
type HomeContent = Record<string, any>;

const asRows = (value: any): Row[] => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const displayName = (person: Row) => person.userName || person.name || person.displayName || person.fullName || "Community member";
const imageFor = (record: Row) => record.avatarUrl || record.imageUrl || record.image || record.featuredImage || record.logoUrl || record.logo || "";
const slugFor = (record: Row) => record.slug || record.id || record.api_id || "";
const dateFor = (value: any) => {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function formatEventDate(value: string, timezone: string | null | undefined) {
  try {
    const utcDate = new Date(`${value}Z`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "America/New_York",
      timeZoneName: "short",
    }).format(utcDate);
  } catch {
    return "Date not available";
  }
}

function EventCard({ event, compact }: { event: Row; compact?: boolean }) {
  const [isGoing, setIsGoing] = useState(false);
  const title = event.title || event.name || "Community event";
  const href = `#event-${encodeURIComponent(String(event.api_id || event.id || ""))}`;
  const attending = event.attendeeCount ?? event.attendeesCount ?? event.attendees?.length ?? 0;
  const rsvp = (
    <Button
      size="sm"
      variant={isGoing ? "default" : "outline"}
      onClick={(clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        setIsGoing(going => !going);
      }}
      className={`text-xs ${isGoing ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
    >
      {isGoing ? "Going" : "RSVP"}
    </Button>
  );

  if (compact) {
    return (
      <a href={href} className="cursor-pointer block">
        <div className="rounded-lg border bg-card text-card-foreground hover:bg-muted/50 transition-colors group">
          <div className="p-4 flex gap-4 items-center">
            <div className="w-16 h-16 flex-shrink-0 relative rounded-md overflow-hidden">
              {event.coverUrl ? (
                <img src={event.coverUrl} alt={title} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center"><CalendarDays className="h-6 w-6 text-muted-foreground" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{title}</h3>
              <div className="text-xs text-muted-foreground">{formatEventDate(event.startTime, event.timezone)}</div>
              <div className="flex items-center gap-2 mt-1">
                {event.visibility !== "private" && rsvp}
                {event.visibility === "members-only" && <div className="bg-amber-500/90 rounded-full p-0.5" title="Members Only"><Crown className="h-3 w-3 text-white" /></div>}
                <span className="text-xs text-muted-foreground">{attending} attending</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={href} className="cursor-pointer block">
      <div className="rounded-lg border bg-card text-card-foreground hover:bg-muted/50 transition-colors group">
        <div className="w-full relative">
          <AspectRatio ratio={1}>
            {event.coverUrl ? (
              <img src={event.coverUrl} alt={title} className="rounded-t-lg object-cover w-full h-full bg-muted" />
            ) : (
              <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center"><CalendarDays className="h-8 w-8 text-muted-foreground" /></div>
            )}
          </AspectRatio>
          {event.visibility === "members-only" && (
            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm" title="Members Only">
              <Crown className="h-3.5 w-3.5 text-white" /><span className="text-xs font-medium text-white">Members Only</span>
            </div>
          )}
          <div className="absolute top-2 right-2">{event.visibility !== "private" && rsvp}</div>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{title}</h3>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /><span className="text-xs">{formatEventDate(event.startTime, event.timezone)}</span></div>
            <div className="flex items-center gap-1"><span className="text-xs">{attending} attending</span></div>
          </div>
        </div>
      </div>
    </a>
  );
}

export function EventList({ content, compact = false }: { content: HomeContent; compact?: boolean }) {
  const now = new Date();
  const events = asRows(content.upcomingEvents ?? content.events ?? content.eventList)
    .filter(event => event.startTime && new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);
  return (
    <div className="space-y-2">
      {events.length > 0 ? (
        <div className="space-y-2">
          <EventCard event={events[0]} compact={compact} />
          {events.slice(1).map(event => <EventCard key={event.api_id} event={event} compact />)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming events</p>
      )}
    </div>
  );
}

export function PeopleDirectory({ content }: { content: HomeContent }) {
  const people = asRows(content.people ?? content.members ?? content.directory)
    .slice()
    .sort((a, b) => (b.stats?.totalEventsAttended ?? b.eventCount ?? 0) - (a.stats?.totalEventsAttended ?? a.eventCount ?? 0));
  const [search, setSearch] = useState("");
  const results = useMemo(() => people.filter(person => displayName(person).toLowerCase().includes(search.toLowerCase())), [people, search]);
  return (
    <section className="flex h-full min-h-0 flex-col" id="directory">
      <div className="relative mb-2 flex-none">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search all members..." value={search} onChange={event => setSearch(event.target.value)} className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0.5">
          {results.map((person, index) => (
            <a
              key={person.id || person.api_id || index}
              href={`#member-${encodeURIComponent(String(slugFor(person)))}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              {imageFor(person) ? (
                <img src={imageFor(person)} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {displayName(person).slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-base font-medium">{displayName(person)}</span>
            </a>
          ))}
          {!results.length && <p className="px-2 py-3 text-sm text-muted-foreground">No members found.</p>}
        </div>
      </div>
      <div className="mt-2 flex-none border-t pt-2 text-center text-xs text-muted-foreground">
        Showing {results.length} of {content.peopleTotal || people.length} members
      </div>
    </section>
  );
}

export function LinksSection() {
  const links = [
    ["About Sarasota Tech", "#about"],
    ["Tech Summit", "#summit"],
    ["Event Calendar", "https://lu.ma/SarasotaTech"],
    ["Get More Involved", "https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM"],
    ["Media Kit", "https://raymmar.notion.site/ST-Media-Kit-1277f5136ac18006aa35c8ccf66ac43a"],
  ];
  const social = [
    { label: "LinkedIn", Icon: Linkedin, href: "https://www.linkedin.com/company/102671680/admin/feed/posts/" },
    { label: "Facebook", Icon: Facebook, href: "https://www.facebook.com/sarasotatechgroup/" },
    { label: "Instagram", Icon: Instagram, href: "https://www.instagram.com/sarasota.tech/" },
    { label: "X (Twitter)", Icon: Twitter, href: "https://twitter.com/SarasotaTech" },
    { label: "WhatsApp", Icon: MessageCircle, href: "https://chat.whatsapp.com/FDBEXC9a5up7PPst5dkGbl" },
  ];
  return (
    <Card className="border">
      <CardHeader className="p-3 md:p-4 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Links</CardTitle>
          <div className="flex gap-4">
            {social.map(({ label, Icon, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-foreground transition-colors hover:text-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-3 pt-4 md:p-4">
        {links.map(([label, href]) => (
          <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              {label}
              {href.startsWith("http") && <ExternalLink className="ml-2 h-4 w-4" />}
            </Button>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function MembershipCard({ content }: { content: HomeContent }) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const membership = content.membership || {};
  const hasEvent = asRows(content.upcomingEvents ?? content.events).length > 0;
  return (
    <Card className="border">
      <CardHeader className="p-3 md:p-4 pb-2">
        {isSubmitted ? (
          <CardTitle>Welcome to Sarasota Tech</CardTitle>
        ) : (
          <>
            <CardTitle className="">{membership.title || "Sarasota.Tech"}</CardTitle>
            <p className="text-muted-foreground text-wrap-balanced text-xl mt-1">
              {membership.description || "We're connecting Sarasota's tech community and driving the city forward."}
            </p>
          </>
        )}
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-12">
        {isSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview only — no invitation or email was sent.
            </p>
            <p className="text-sm text-muted-foreground">Thanks for your interest in Sarasota Tech.</p>
          </div>
        ) : (
          <form
            onSubmit={event => {
              event.preventDefault();
              setIsSubmitted(true);
            }}
            className="space-y-4"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Email"
                type="email"
                className="flex-1"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                disabled={!hasEvent}
              />
              <Button className="bg-primary hover:bg-primary/90" type="submit" disabled={!hasEvent}>
                {membership.ctaLabel || "Subscribe"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasEvent
                ? "Enter your email for an invite to our next event along with occasional updates about our growing community."
                : "No upcoming events available at the moment."}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCard({ title, value, icon: Icon, description }: { title: string; value: any; icon: typeof Calendar; description: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-4">
        <CardTitle className="truncate text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-4">
        <div className="truncate text-lg font-bold sm:text-2xl">{value ?? "—"}</div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function PinnedPostsCarousel({ content }: { content: HomeContent }) {
  const pinned = asRows(content.pinnedPosts ?? content.posts)
    .filter(post => !post.membersOnly && (content.pinnedPosts || post.isPinned || post.pinned))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [index, setIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    if (pinned.length <= 1) return;
    const interval = setInterval(() => setIndex(current => (current + 1) % pinned.length), 15000);
    return () => clearInterval(interval);
  }, [pinned.length]);
  if (!pinned.length) return null;
  const post = pinned[index % pinned.length];
  const image = imageFor(post);
  return (
    <Card className="border relative overflow-hidden h-[360px] group cursor-pointer" onClick={() => { window.location.hash = "news"; }}>
      {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" onLoad={() => setImageLoaded(true)} />}
      {!image && <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-950 text-white"><ImageIcon className="h-12 w-12 opacity-50" /></div>}
      {!imageLoaded && image && <div className="absolute inset-0 bg-muted animate-pulse" />}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute top-6 right-6 flex flex-wrap gap-2 z-20">
        {post.membersOnly && <Badge variant="secondary" className="text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Members Only</Badge>}
        {post.redirectUrl && !post.redirectUrl.startsWith("/") && <Badge variant="secondary" className="text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" />External Link</Badge>}
        {(post.tags || []).map((tag: string) => <Badge key={tag} variant="outline" className="text-xs text-white border-white/40 hover:bg-white/10">{tag}</Badge>)}
      </div>
      {pinned.length > 1 && (
        <>
          <button onClick={event => { event.stopPropagation(); setIndex(current => current === 0 ? pinned.length - 1 : current - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-foreground p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30" aria-label="Previous featured post"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={event => { event.stopPropagation(); setIndex(current => (current + 1) % pinned.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-foreground p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30" aria-label="Next featured post"><ChevronRight className="h-6 w-6" /></button>
        </>
      )}
      <CardContent className="relative h-full flex flex-col justify-end p-3 md:p-4 text-white z-10">
        <h3 className="text-2xl font-bold mb-2">{post.title || post.name}</h3>
        {post.summary && <p className="text-white/90 mb-4 line-clamp-2">{post.summary}</p>}
        <Button variant="secondary" className="w-fit" onClick={event => { event.stopPropagation(); window.location.hash = "news"; }}>Read More</Button>
        {pinned.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30" onClick={event => event.stopPropagation()}>
            {pinned.map((_, dotIndex) => (
              <button key={dotIndex} aria-label={`Show featured post ${dotIndex + 1}`} onClick={event => { event.stopPropagation(); setIndex(dotIndex); }} className={`w-2 h-2 rounded-full transition-colors ${dotIndex === index ? "bg-white" : "bg-white/50"}`} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublicPostsTable({ content }: { content: HomeContent }) {
  const [displayCount, setDisplayCount] = useState(5);
  const posts = asRows(content.posts ?? content.news)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const displayedPosts = posts.slice(0, displayCount);
  return (
    <Card id="news" className="border">
      <CardHeader className="p-3 md:p-4 pb-3"><div className="flex items-center justify-between"><CardTitle>Community News</CardTitle></div></CardHeader>
      <CardContent className="p-3 md:p-4">
        {!posts.length ? (
          <div className="text-sm text-muted-foreground">No posts available at the moment.</div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post, index) => (
              <div
                key={post.id || index}
                className={`relative p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg ${post.membersOnly ? "overflow-hidden" : ""}`}
                onClick={() => { window.location.hash = `post-${encodeURIComponent(String(post.id || index))}`; }}
              >
                {post.membersOnly && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-2"><Lock className="h-5 w-5" /><span className="font-medium">Members Only Content</span></div>
                    <a href="#login" onClick={event => event.stopPropagation()}><Button variant="default">Sign in to View</Button></a>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  {imageFor(post) ? (
                    <div className="w-full sm:w-20 h-auto sm:h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img src={imageFor(post)} alt="" className="w-full h-full object-cover" style={{ aspectRatio: "16 / 9" }} />
                    </div>
                  ) : (
                    <div className="w-full sm:w-20 h-auto sm:h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0" style={{ aspectRatio: "16 / 9" }}>
                      <ExternalLink className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-wrap-balance max-w-[80ch] truncate flex items-center gap-2">
                        {post.title}
                        <div className="flex gap-2">
                          {post.isPinned && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                          {post.membersOnly && <Badge variant="secondary" className="text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Members Only</Badge>}
                          {post.redirectUrl && <Badge variant="secondary" className="text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" />External Link</Badge>}
                        </div>
                      </h4>
                    </div>
                    {post.summary && <p className="text-sm text-muted-foreground mt-1 text-wrap-balance max-w-[80ch] line-clamp-2">{post.summary}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{post.creator?.displayName || post.author || "Unknown"}</span>
                      <span>•</span>
                      <span>{dateFor(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {displayCount < posts.length && (
              <div className="pt-2 text-center">
                <Button variant="outline" onClick={() => setDisplayCount(count => count + 5)}>Load More</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeaturedMemberCard({ content }: { content: HomeContent }) {
  const person = content.featuredMember || asRows(content.people ?? content.members)[0];
  const profileAnchor = person ? `#member-${encodeURIComponent(String(slugFor(person)))}` : "#directory";
  return (
    <a href={profileAnchor} className="group block w-full h-full">
      <Card className="w-full h-full flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="p-3 md:p-4 pb-2 flex-none"><CardTitle className="flex justify-between items-center text-lg"><span>Featured Member</span></CardTitle></CardHeader>
        {person ? (
          <CardContent className="p-3 md:p-4 pt-0 space-y-4 flex-1 flex flex-col">
            <div className="flex items-center gap-3">
              {imageFor(person) ? <img src={imageFor(person)} alt={displayName(person)} className="h-14 w-14 rounded-full object-cover transition-all group-hover:shadow-md" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg">{displayName(person)[0]}</span>}
              <div><h3 className="font-semibold group-hover:underline">{displayName(person)}</h3>{person.jobTitle && <p className="text-sm text-muted-foreground">{person.jobTitle}</p>}</div>
            </div>
            {(person.bio || person.user?.bio) && <p className="line-clamp-4 flex-grow text-sm">{person.bio || person.user?.bio}</p>}
            {(person.badges || person.user?.badges || []).length > 0 && <div className="flex flex-wrap gap-2">{(person.badges || person.user?.badges || []).slice(0, 5).map((badge: any) => <Badge key={badge.id || badge.name} variant="secondary">{badge.name || badge}</Badge>)}</div>}
          </CardContent>
        ) : <CardContent className="p-4 text-center text-sm text-muted-foreground">No members available</CardContent>}
      </Card>
    </a>
  );
}

export function SponsorGrid({ content }: { content: HomeContent }) {
  const sponsors = asRows(content.sponsors ?? content.annualSponsors);
  const tiers = [
    { name: "Series A", key: "Series A", cols: 1 },
    { name: "Seed", key: "Seed", cols: 2 },
    { name: "Angel", key: "Angel", cols: 4 },
    { name: "Friends & Family", key: "Friends & Family", cols: 5 },
    { name: "501c3/.edu", key: "501c3/.edu", cols: 7, description: "Nonprofit & education sponsors" },
  ];
  return (
    <Card className="w-full max-w-full overflow-hidden border">
      <CardHeader className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Our Sponsors</CardTitle>
          <a href="#sponsors" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full sm:w-auto whitespace-nowrap">
              <span className="hidden sm:inline">Become a Sponsor</span>
              <span className="sm:hidden">Sponsor</span>
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4 space-y-8">
        {tiers.map(tier => {
          const tierSponsors = sponsors.filter(sponsor => sponsor.tier === tier.key);
          if (!tierSponsors.length) return null;
          const columns = tier.cols === 1
            ? "grid-cols-1"
            : tier.cols === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : tier.cols === 3
                ? "grid-cols-2 md:grid-cols-3"
                : tier.cols === 4
                  ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
          return (
            <div key={tier.key} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                {tier.description && <p className="text-sm text-muted-foreground">{tier.description}</p>}
              </div>
              <div className={`grid gap-4 ${columns}`}>
                {tierSponsors.map(sponsor => (
                  <a key={sponsor.id} href={sponsor.url || undefined} target="_blank" rel="noopener noreferrer" className="block group relative w-full max-w-full">
                    <div className="flex flex-col h-full w-full max-w-full border border-border rounded-lg p-3">
                      <div className={`mb-3 bg-white dark:bg-white rounded-lg flex items-center justify-center ${sponsor.tier !== "Series A" ? "aspect-square" : ""}`} style={{ padding: `${sponsor.logoPadding ?? 16}px` }}>
                        <img src={imageFor(sponsor)} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="text-center"><h4 className="font-semibold text-sm line-clamp-2">{sponsor.name}</h4></div>
                    </div>
                  </a>
                ))}
                {tier.key === "Seed" && tierSponsors.length % 2 === 1 && (
                  <a href="#sponsors" className="block">
                    <div className="flex flex-col h-full items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-muted-foreground/50 transition-colors">
                      <div className="text-sm text-muted-foreground flex items-center gap-2"><span>Become a Sponsor</span><ExternalLink className="h-4 w-4" /></div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {!sponsors.length && <p className="text-sm text-muted-foreground">Sponsor listings are coming soon.</p>}
      </CardContent>
    </Card>
  );
}

export function VideoEmbed({ content }: { content: HomeContent }) {
  const video = content.video || {};
  const thumbnail = video.thumbnail || video.thumbnailUrl || "";
  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="relative p-0" style={{ paddingTop: "56.25%" }}>
        {thumbnail ? <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white"><Youtube className="h-12 w-12 opacity-80" /></div>}
        <div className="absolute inset-0 flex items-end bg-black/20 p-4 text-white">
          <div><p className="font-semibold">{video.title || "Sarasota Tech community video"}</p>{video.caption && <p className="text-sm text-white/80">{video.caption}</p>}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeStats({ content }: { content: HomeContent }) {
  const stats = content.stats || {};
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="Events" value={stats.events ?? stats.eventCount ?? 0} icon={Calendar} description="Since August 2023" />
      <StatCard title="Tickets" value={stats.totalAttendees ?? stats.tickets ?? 0} icon={Ticket} description="Total event attendance" />
      <StatCard title="Subscribers" value={stats.uniqueAttendees ?? stats.subscribers ?? 0} icon={UserPlus} description="68% open rate 23% click rate" />
    </div>
  );
}

