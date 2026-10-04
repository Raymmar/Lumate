import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  summits,
  timeBlocks,
  presentations,
  speakers,
  presentationSpeakers,
  sponsors,
  sponsorships,
  companies,
  posts,
  type Summit,
  type SummitGalleryImage,
  type SummitHighlight,
  type SummitLink,
} from "@shared/schema";

/**
 * Idempotent backfill that turns the formerly hardcoded 2025 and 2026 summit
 * pages into data:
 *  - creates the 2025 and 2026 summit records (never overwrites admin edits)
 *  - assigns agenda items that are not linked to any summit to 2026
 *  - links posts tagged "2026 summit" / "summit 2026" (or any "<year> summit") to that year
 *  - recreates the 2025 agenda, speakers and sponsors from the old hardcoded page
 *
 * Every step checks for existing data first, so re-running never duplicates records.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const STS_HERO_IMAGE =
  "https://file-upload.replit.app/api/storage/images%2F1742359287380-STS_Jan'25-109%20compressed.jpeg";

const SUMMIT_2026 = {
  year: 2026,
  title: "Sarasota Tech Summit",
  tagline: "One Day Mini-Conf & Startup Fair",
  description:
    "Join us for the second annual Sarasota Tech Summit featuring a startup school, investor quick pitch event, demo stations, hands on workshops, networking opportunities, and insights into how we're building the future of Sarasota's tech ecosystem.",
  startDate: "2026-01-15",
  dateLabel: "January 15th, 2026",
  venueName: "MOTE SEA",
  venueMapUrl: "https://maps.app.goo.gl/mu5JzP3rRPvrDzAV9",
  ticketUrl: "https://luma.com/sts26",
  videoEmbedUrl: "https://www.youtube.com/embed/z2wyOGwpUHg",
  heroImage: STS_HERO_IMAGE,
  logoImage:
    "https://file-upload.replit.app/api/storage/images%2F1761418772061-Logo-block-white.png",
  dateBlockImage:
    "https://file-upload.replit.app/api/storage/images%2F1761418176546-Mote---Date-block.png",
  seoImage:
    "https://file-upload.replit.app/api/storage/images%2F1761584634963-Thumbnail-Main.png",
  presentedByName: "Rework Capital",
  presentedByUrl: "https://www.rework.capital/",
  highlights: [
    {
      title: "Startup School",
      description:
        "Experts in venture capital, software development, branding, business formation, intellectual property rights, accounting, finance + more will be on site running small group breakouts and interactive workshops.",
      ctaLabel: "Sign Up for Startup School",
      ctaUrl: "https://airtable.com/applDXoTdj4LPUUVc/pag3NvdulUOPTQ5SX/form",
    },
    {
      title: "Quick Pitch",
      description:
        "Are you looking for financing or feedback on your startup? Sign up for our Quick Pitch to practice your pitch in a fast paced feedback session with real time input from a panel of experienced investors.",
      ctaLabel: "Apply for Quick Pitch",
      ctaUrl: "https://airtable.com/applDXoTdj4LPUUVc/pag3NvdulUOPTQ5SX/form",
    },
    {
      title: "Demo Stations",
      description:
        "Are you working on something interesting and want to show it off? A robotics project, new software, game, 3D print or hardware? Fill out the form below and we might invite you to demo it live at the Summit.",
      ctaLabel: "Show off your demo",
      ctaUrl: "https://airtable.com/applDXoTdj4LPUUVc/pag3NvdulUOPTQ5SX/form",
    },
  ] satisfies SummitHighlight[],
  links: [
    {
      label: "Sponsor Overview",
      url: "https://drive.google.com/file/d/1gcsQov4eRW_-GL25k1e7AypxU6qpxIWz/view?usp=drive_link",
    },
    { label: "Apply to Speak", url: "https://airtable.com/applDXoTdj4LPUUVc/shrzIM9RcYBek4C0k" },
    { label: "Host an Event", url: "https://airtable.com/applDXoTdj4LPUUVc/shrnlKIwiBZbQALP3" },
    { label: "Volunteer", url: "https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM" },
  ] satisfies SummitLink[],
  galleryImages: [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png",
      alt: "Sarasota Tech Summit 2025",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1761426785264-Friends---Family-1.png",
      alt: "Event highlights",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1761426777313-Friends---Family.png",
      alt: "Sponsors",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png",
      alt: "Event graphics",
    },
  ] satisfies SummitGalleryImage[],
  isPublished: true,
};

const SUMMIT_2025 = {
  year: 2025,
  title: "Sarasota Tech Summit",
  tagline: "Can Sarasota become a tech town?",
  description:
    "The inaugural Sarasota Tech Summit brought together more than 300 tech professionals, investors, and thought leaders to explore whether Sarasota has what it takes to become a thriving tech hub. A packed evening of insightful discussions, networking, and visioning the future of tech in Sarasota.",
  startDate: "2025-01-09",
  dateLabel: "January 9th, 2025 · 5:00 PM – 10:00 PM",
  venueName: "Art Ovation Hotel",
  venueAddress: "Downtown Sarasota",
  ticketUrl: "https://lu.ma/r21g3q5c?coupon=EARLY25",
  photosUrl:
    "https://www.dropbox.com/scl/fo/tx5vb725ywzytkfog1iv1/AGfyY_yWKWKsnOn64QjCXiA?rlkey=ue2nlaso4lrb3ug59memgqqmh&dl=0",
  heroImage: STS_HERO_IMAGE,
  seoImage:
    "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png",
  highlights: [] as SummitHighlight[],
  links: [] as SummitLink[],
  galleryImages: [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267170221-Investments.png",
      alt: "Is Sarasota Investable?",
      title: "Is Sarasota Investable?",
      description: "Peter Offringa, Saxon Baum, and Scott Lopano discuss investment opportunities in Sarasota.",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267508219-Tech-Trends.jpeg",
      alt: "Good, Bad & Ugly of AI",
      title: "Emerging Tech Trends: The Good, Bad & Ugly of AI",
      description: "Toby Wade, Elizabeth Stamoulis, and Sam Bobo explore the multifaceted impacts of artificial intelligence.",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267166461-Fireside-Chat.png",
      alt: "Fireside Chat",
      title: "How to Move a City Forward?",
      description: "Fireside chat with AG Lafley and Anand Pallegar on shaping Sarasota's future.",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267544912-Final-Thoughts.jpeg",
      alt: "Looking Ahead",
      title: "Looking Ahead: The Future of Sarasota Tech",
      description: "Introducing the 2025 Sarasota Tech Board of Directors.",
    },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png", alt: "Sarasota Tech Summit Header" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267132207-2-Question.png", alt: "Can Sarasota become a tech town?" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267136780-3-VC-Sponsors.png", alt: "Marquee sponsors" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png", alt: "Abstract text background" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267148243-5-Startup-Sponsors.png", alt: "Startup sponsors" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267152043-6-Advisory-Sponsors.png", alt: "Advisory sponsors" },
    { src: "https://file-upload.replit.app/api/storage/images%2F1744267155376-7-Founding-Members.png", alt: "Founding members" },
  ] satisfies SummitGalleryImage[],
  isPublished: true,
};

// Speakers from the 2025 agenda. Aliases catch profiles that already exist under a
// slightly different name so a returning speaker is reused instead of duplicated.
const SPEAKERS_2025: Record<string, string[]> = {
  "Peter Offringa": [],
  "Saxon Baum": [],
  "Scott Lopano": [],
  "Vlad Ljesevic": ["Vladimir Ljesevic"],
  "Toby Wade": [],
  "Elizabeth Stamoulis": [],
  "Sam Bobo": [],
  "Pete Petersen": ["Peter Petersen"],
  "AG Lafley": ["A.G. Lafley", "A. G. Lafley"],
  "Anand Pallegar": [],
  "Raymmar Tirado": ["Raymmar"],
  "Toli Marschuk": ["Toli Marchuk"],
};

// Times are Eastern (EST, UTC-5) on January 9th, 2025. Hours past midnight UTC roll over.
function est2025(hour: number, minute = 0): string {
  return new Date(Date.UTC(2025, 0, 9, hour + 5, minute)).toISOString();
}

type AgendaItem = {
  title: string;
  description: string | null;
  start: [number, number];
  end: [number, number];
  sessionType: string;
  speakers: string[];
  moderators: string[];
};

// Descriptions keep the exact wording from the original 2025 page.
const AGENDA_2025: AgendaItem[] = [
  {
    title: "Let's Taco Bout Tech",
    description: "(Taco bar by Art Ovation) · Arrival + Food + Networking + Demo tables",
    start: [17, 0],
    end: [18, 0],
    sessionType: "networking",
    speakers: [],
    moderators: [],
  },
  {
    title: "Opening Remarks",
    description: "(Main Ballroom) · EDC of Sarasota County",
    start: [18, 0],
    end: [18, 5],
    sessionType: "talk",
    speakers: [],
    moderators: [],
  },
  {
    title: "Is Sarasota Investable?",
    description: null,
    start: [18, 5],
    end: [18, 35],
    sessionType: "panel",
    speakers: ["Peter Offringa", "Saxon Baum", "Scott Lopano"],
    moderators: ["Vlad Ljesevic"],
  },
  {
    title: "Emerging Tech Trends",
    description: "(The Good, The Bad, The Ugly of AI)",
    start: [18, 35],
    end: [19, 0],
    sessionType: "panel",
    speakers: ["Toby Wade", "Elizabeth Stamoulis", "Sam Bobo"],
    moderators: ["Pete Petersen"],
  },
  {
    title: "How to move a city forward?",
    description: "Fireside chat with AG Lafley + Anand Pallegar",
    start: [19, 10],
    end: [19, 45],
    sessionType: "panel",
    speakers: ["AG Lafley", "Anand Pallegar"],
    moderators: [],
  },
  {
    title: "Town hall discussion",
    description: "Connecting the dots",
    start: [19, 45],
    end: [20, 15],
    sessionType: "panel",
    speakers: [],
    moderators: ["Raymmar Tirado"],
  },
  {
    title: "Looking Ahead",
    description: "2025 Sarasota Tech Board of Directors",
    start: [20, 15],
    end: [20, 30],
    sessionType: "talk",
    speakers: ["Raymmar Tirado", "Pete Petersen", "Vlad Ljesevic", "Toli Marschuk"],
    moderators: [],
  },
  {
    title: "VIP Afterparty",
    description: "Art Ovation Lobby",
    start: [20, 30],
    end: [22, 0],
    sessionType: "networking",
    speakers: [],
    moderators: [],
  },
];

// 2025 sponsor groups mapped onto the existing sponsor tiers:
// VC sponsors -> Series A, Startup sponsors -> Seed, Advisory sponsors -> 501c3/.edu
const SPONSORS_2025 = [
  { name: "Truist Foundation", tier: "Series A", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/67327c7631db707c11c708cf_1icejcbpd-8VNNJZRB.webp", url: "https://www.sarasota.tech/entities/truist-foundation" },
  { name: "EDC of Sarasota County", tier: "Series A", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65cd141854050092684729e6_1hmkhcvr3-CZZEY10D.webp", url: "https://www.sarasota.tech/entities/sarasota-edc" },
  { name: "ROBRADY", tier: "Seed", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65fb0982b27fdcf74e7f4a4f_1hpe9q1is-CGNXH684.webp", url: "https://www.sarasota.tech/entities/robrady" },
  { name: "RevContent", tier: "Seed", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b318431e4c0210021f821_281762150_3940173906208184_4235986378783041098_n.jpg", url: "https://www.sarasota.tech/entities/revcontent" },
  { name: "lab SRQ", tier: "Seed", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/674faa1452273d5c064600af_1ie7j0mp0-M2JWEPRT.webp", url: "https://www.sarasota.tech/entities/lab-srq" },
  { name: "SCF Center for Advanced Technology and Innovation", tier: "501c3/.edu", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677d469885576e2f6410432b_1ih0lnd76-2WP2JX8W.webp", url: "https://www.sarasota.tech/entities/scf-center-for-advanced-technology-and-innovation" },
  { name: "Suncoast Science Center/Faulhaber Fab Lab", tier: "501c3/.edu", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677b768a14094b95e1f1a6e6_327319518_480901650901561_1132036045765432866_n.png", url: "https://www.sarasota.tech/entities/suncoast-science-center-faulhaber-fab-lab" },
  { name: "USF Muma College of Business", tier: "501c3/.edu", logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b55d2bf9d5cdf9fadc0ec_1ieuceb3b-631TKYGH.png", url: "https://www.sarasota.tech/entities/usf-muma-college-of-business-sarasota-manatee" },
];

export type SummitBackfillResult = {
  skipped: boolean;
  createdSummits: number[];
  linkedTimeBlocks: number;
  linkedPresentations: number;
  linkedPosts: number;
  created2025Presentations: number;
  created2025Speakers: number;
  reused2025Speakers: number;
  created2025Sponsors: number;
  created2025Sponsorships: number;
};

async function ensureSummit(
  tx: Tx,
  data: typeof SUMMIT_2025 | typeof SUMMIT_2026,
  created: number[],
): Promise<Summit> {
  const [existing] = await tx.select().from(summits).where(eq(summits.year, data.year));
  if (existing) return existing;
  const [inserted] = await tx.insert(summits).values(data).returning();
  created.push(data.year);
  return inserted;
}

async function findOrCreateSpeaker(
  tx: Tx,
  name: string,
  result: SummitBackfillResult,
): Promise<number> {
  const candidates = [name, ...(SPEAKERS_2025[name] || [])].map((n) => n.toLowerCase().trim());
  const [existing] = await tx
    .select({ id: speakers.id })
    .from(speakers)
    .where(sql`lower(trim(${speakers.name})) in (${sql.join(candidates.map((c) => sql`${c}`), sql`, `)})`)
    .orderBy(speakers.id)
    .limit(1);
  if (existing) {
    result.reused2025Speakers++;
    return existing.id;
  }
  const [inserted] = await tx.insert(speakers).values({ name, photo: "" }).returning({ id: speakers.id });
  result.created2025Speakers++;
  return inserted.id;
}

async function backfill2025Agenda(tx: Tx, summit: Summit, result: SummitBackfillResult) {
  const [{ count: blockCount }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(timeBlocks)
    .where(eq(timeBlocks.summitId, summit.id));
  const [{ count: presentationCount }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(presentations)
    .where(eq(presentations.summitId, summit.id));
  if (blockCount > 0 || presentationCount > 0) return;

  const speakerIds = new Map<string, number>();
  const speakerId = async (name: string) => {
    if (!speakerIds.has(name)) speakerIds.set(name, await findOrCreateSpeaker(tx, name, result));
    return speakerIds.get(name)!;
  };

  for (let index = 0; index < AGENDA_2025.length; index++) {
    const item = AGENDA_2025[index];
    const startTime = est2025(item.start[0], item.start[1]);
    const endTime = est2025(item.end[0], item.end[1]);
    const [block] = await tx
      .insert(timeBlocks)
      .values({
        summitId: summit.id,
        title: item.title,
        description: null,
        startTime,
        endTime,
        displayOrder: index + 1,
      })
      .returning();
    const [presentation] = await tx
      .insert(presentations)
      .values({
        summitId: summit.id,
        timeBlockId: block.id,
        title: item.title,
        description: item.description,
        startTime,
        endTime,
        track: "main_stage",
        sessionType: item.sessionType,
        isFullWidth: true,
        displayOrder: 0,
      })
      .returning();
    result.created2025Presentations++;

    let order = 0;
    for (const name of item.speakers) {
      await tx.insert(presentationSpeakers).values({
        presentationId: presentation.id,
        speakerId: await speakerId(name),
        isModerator: false,
        displayOrder: order++,
      });
    }
    for (const name of item.moderators) {
      await tx.insert(presentationSpeakers).values({
        presentationId: presentation.id,
        speakerId: await speakerId(name),
        isModerator: true,
        displayOrder: order++,
      });
    }
  }
}

/**
 * Gives each 2025 sponsor a 2025 sponsorship. Reuses the existing sponsor record
 * (same name, or the record linked to the same-named company) so the sponsor's
 * current logo and link are shown in every year; only unknown sponsors are created.
 */
async function backfill2025Sponsors(tx: Tx, result: SummitBackfillResult) {
  for (const sponsor of SPONSORS_2025) {
    const lowerName = sponsor.name.toLowerCase().trim();
    const [byName] = await tx
      .select({ id: sponsors.id })
      .from(sponsors)
      .where(and(isNull(sponsors.deletedAt), sql`lower(trim(${sponsors.name})) = ${lowerName}`))
      .orderBy(sql`coalesce(${sponsors.year}, 0) desc`, sql`${sponsors.id} desc`)
      .limit(1);
    let sponsorId = byName?.id ?? null;

    let companyId: number | null = null;
    if (!sponsorId) {
      const [company] = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(sql`lower(trim(${companies.name})) = ${lowerName}`)
        .limit(1);
      companyId = company?.id ?? null;
      if (companyId) {
        const [byCompany] = await tx
          .select({ id: sponsors.id })
          .from(sponsors)
          .where(and(isNull(sponsors.deletedAt), eq(sponsors.companyId, companyId)))
          .orderBy(sql`coalesce(${sponsors.year}, 0) desc`, sql`${sponsors.id} desc`)
          .limit(1);
        sponsorId = byCompany?.id ?? null;
      }
    }

    if (!sponsorId) {
      const [inserted] = await tx
        .insert(sponsors)
        .values({ name: sponsor.name, logo: sponsor.logo, url: sponsor.url, companyId })
        .returning({ id: sponsors.id });
      sponsorId = inserted.id;
      result.created2025Sponsors++;
    }

    const [existing] = await tx
      .select({ id: sponsorships.id })
      .from(sponsorships)
      .where(and(eq(sponsorships.sponsorId, sponsorId), eq(sponsorships.year, 2025)))
      .limit(1);
    // Any row, even a removed one, means this was already handled (respect admin removals)
    if (existing) continue;
    await tx.insert(sponsorships).values({ sponsorId, year: 2025, tier: sponsor.tier });
    result.created2025Sponsorships++;
  }
}

async function linkUnassignedAgenda(tx: Tx, summit2026: Summit, result: SummitBackfillResult) {
  const blocks = await tx
    .update(timeBlocks)
    .set({ summitId: summit2026.id })
    .where(isNull(timeBlocks.summitId))
    .returning({ id: timeBlocks.id });
  result.linkedTimeBlocks = blocks.length;

  // Presentations follow their time block's summit; unblocked ones go to 2026
  const followBlock = await tx.execute(sql`
    UPDATE presentations p SET summit_id = tb.summit_id
    FROM time_blocks tb
    WHERE p.time_block_id = tb.id AND p.summit_id IS NULL AND tb.summit_id IS NOT NULL
    RETURNING p.id
  `);
  const loose = await tx
    .update(presentations)
    .set({ summitId: summit2026.id })
    .where(isNull(presentations.summitId))
    .returning({ id: presentations.id });
  result.linkedPresentations = (followBlock.rows?.length ?? 0) + loose.length;
}

async function linkSummitTaggedPosts(tx: Tx, result: SummitBackfillResult) {
  // Tags like "2026 summit" or "summit 2026" link the post to that year's summit
  const linked = await tx.execute(sql`
    UPDATE posts p SET summit_id = s.id
    FROM post_tags pt
    JOIN tags t ON t.id = pt.tag_id
    JOIN summits s ON s.year = coalesce(
      substring(lower(trim(t.text)) from '^(\\d{4})\\s+summit$'),
      substring(lower(trim(t.text)) from '^summit\\s+(\\d{4})$')
    )::int
    WHERE pt.post_id = p.id AND p.summit_id IS NULL
    RETURNING p.id
  `);
  result.linkedPosts = linked.rows?.length ?? 0;
}

/**
 * Runs the summit backfill in a single transaction.
 * By default it only runs when no summit records exist yet (first run after the
 * schema change). Pass `force: true` to re-run the idempotent steps anyway.
 */
export async function backfillSummits(options: { force?: boolean } = {}): Promise<SummitBackfillResult> {
  const result: SummitBackfillResult = {
    skipped: false,
    createdSummits: [],
    linkedTimeBlocks: 0,
    linkedPresentations: 0,
    linkedPosts: 0,
    created2025Presentations: 0,
    created2025Speakers: 0,
    reused2025Speakers: 0,
    created2025Sponsors: 0,
    created2025Sponsorships: 0,
  };

  if (!options.force) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(summits);
    if (count > 0) {
      result.skipped = true;
      return result;
    }
  }

  await db.transaction(async (tx) => {
    const summit2025 = await ensureSummit(tx, SUMMIT_2025, result.createdSummits);
    const summit2026 = await ensureSummit(tx, SUMMIT_2026, result.createdSummits);

    const [current] = await tx.select({ id: summits.id }).from(summits).where(eq(summits.isCurrent, true));
    if (!current) {
      await tx.update(summits).set({ isCurrent: true }).where(eq(summits.id, summit2026.id));
    }

    // Link existing (2026) agenda before creating the 2025 agenda so the new
    // 2025 items are never swept into 2026.
    await linkUnassignedAgenda(tx, summit2026, result);
    await backfill2025Agenda(tx, summit2025, result);
    await backfill2025Sponsors(tx, result);
    await linkSummitTaggedPosts(tx, result);
  });

  return result;
}
