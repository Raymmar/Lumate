import { db } from "../db";
import { posts, postTags, tags, companies, people } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
}

interface PostOpenGraphData extends OpenGraphData {}
interface CompanyOpenGraphData extends OpenGraphData {}
interface UserOpenGraphData extends OpenGraphData {}
interface EventOpenGraphData extends OpenGraphData {}

/**
 * Helper function to format post title for URL (matches client-side logic)
 */
function formatPostTitleForUrl(
  title: string | null,
  fallbackId: string,
): string {
  if (!title) return `p-${fallbackId}`;

  let processed = title
    .replace(/\./g, "")
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  if (!processed) {
    return `p-${fallbackId}`;
  }

  processed = processed.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");

  return processed;
}

/**
 * Helper function to format company name for URL (matches client-side logic)
 */
function formatCompanyNameForUrl(
  companyName: string | null,
  fallbackId: string,
): string {
  if (!companyName) return `c-${fallbackId}`;

  let processed = companyName
    .replace(/\./g, "")
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  if (!processed) {
    return `c-${fallbackId}`;
  }

  processed = processed.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");

  return processed;
}

/**
 * Helper function to format username for URL (matches client-side logic)
 */
function formatUsernameForUrl(
  username: string | null,
  fallbackId: string,
): string {
  if (!username) return fallbackId;

  let processed = username
    .replace(/Dr\./i, "dr")
    .replace(/Mr\./i, "mr")
    .replace(/Mrs\./i, "mrs")
    .replace(/Ms\./i, "ms")
    .replace(/\./g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  if (!processed) {
    return fallbackId;
  }

  processed = processed.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");

  return processed;
}

/**
 * Helper function to format event title for URL (matches client-side logic)
 */
function formatEventTitleForUrl(
  title: string | null,
  fallbackId: string,
): string {
  if (!title) return `e-${fallbackId}`;

  let processed = title
    .replace(/\./g, "")
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  if (!processed) {
    return `e-${fallbackId}`;
  }

  processed = processed.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");

  return processed;
}

/**
 * Fetches post data for Open Graph meta tags
 * @param slug - The post slug from the URL
 * @returns Post data or null if not found
 */
export async function fetchPostForOpenGraph(
  slug: string,
): Promise<PostOpenGraphData | null> {
  try {
    // First get all posts to find the one with matching slug
    const allPosts = await db.select().from(posts);

    // Find post by matching slug
    const post = allPosts.find(
      (p) => formatPostTitleForUrl(p.title, p.id.toString()) === slug,
    );

    if (!post) {
      return null;
    }

    // Get creator info
    const creator = await storage.getUser(post.creatorId);

    // Use summary as description, fallback to truncated body if no summary
    let description = post.summary || "";
    if (!description && post.body) {
      // Strip HTML tags and truncate
      description =
        post.body
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/&[^;]+;/g, "") // Remove HTML entities
          .trim()
          .substring(0, 155) + "..."; // Truncate to ideal meta description length
    }

    // Fallback description
    if (!description) {
      description = "Read this article on Sarasota Tech community platform.";
    }

    // Default image fallback
    const defaultImage =
      "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg";

    return {
      title: post.title || "Sarasota Tech Article",
      description,
      image: post.featuredImage || defaultImage,
      url: `https://sarasota.tech/post/${slug}`, // Use production domain
    };
  } catch (error) {
    console.error("Error fetching post for Open Graph:", error);
    return null;
  }
}

/**
 * Fetches company data for Open Graph meta tags
 * @param slug - The company slug from the URL
 * @returns Company data or null if not found
 */
export async function fetchCompanyForOpenGraph(
  slug: string,
): Promise<CompanyOpenGraphData | null> {
  try {
    // Try to find company by slug first (more efficient)
    let company = await storage.getCompanyBySlug(slug);

    // If not found by slug, fall back to searching all companies by generated slug
    if (!company) {
      const allCompanies = await storage.getCompanies();
      company =
        allCompanies.find(
          (c) => formatCompanyNameForUrl(c.name, c.id.toString()) === slug,
        ) || null;
    }

    if (!company) {
      return null;
    }

    // Build description from available fields
    let description = company.bio || company.description || "";
    if (!description) {
      let parts = [];
      if (company.industry) parts.push(company.industry);
      if (company.size) parts.push(`${company.size} company`);
      if (company.founded) parts.push(`founded in ${company.founded}`);

      description =
        parts.length > 0
          ? `${company.name} - ${parts.join(", ")}.`
          : `${company.name} - Company profile on Sarasota Tech community platform.`;
    }

    // Ensure description isn't too long
    if (description.length > 155) {
      description = description.substring(0, 152) + "...";
    }

    // Default image fallback
    const defaultImage =
      "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg";

    return {
      title: `${company.name} | Sarasota Tech`,
      description,
      image: company.featuredImageUrl || company.logoUrl || defaultImage,
      url: `https://sarasota.tech/companies/${slug}`, // Use production domain
    };
  } catch (error) {
    console.error("Error fetching company for Open Graph:", error);
    return null;
  }
}

/**
 * Fetches user profile data for Open Graph meta tags
 * @param username - The username from the URL
 * @returns User data or null if not found
 */
export async function fetchUserForOpenGraph(
  username: string,
): Promise<UserOpenGraphData | null> {
  try {
    // Decode the URL-encoded username and handle special characters
    const decodedUsername = decodeURIComponent(username)
      .replace(/^dr-/, "Dr. ") // Convert "dr-" prefix back to "Dr. "
      .replace(/-/g, " "); // Convert remaining hyphens to spaces for lookup

    // First get all people to find the one with matching username
    const allPeople = await db.select().from(people);

    // Find person by matching formatted username or by generated username
    let person = allPeople.find((p) => {
      if (!p.userName) return false;

      // Check if decoded username matches directly
      if (p.userName.toLowerCase() === decodedUsername.toLowerCase()) {
        return true;
      }

      // Check if the formatted version matches the URL username
      return formatUsernameForUrl(p.userName, p.id.toString()) === username;
    });

    if (!person) {
      return null;
    }

    // Get associated user data if available by email
    let user = null;
    if (person.email) {
      try {
        user = await storage.getUserByEmail(person.email);
      } catch (e) {
        // User might not exist, that's ok
      }
    }

    // Build description from available bio fields
    let description = person.bio || user?.bio || "";

    if (!description) {
      description = `${person.userName} - Member profile on Sarasota Tech community platform.`;
    }

    // Ensure description isn't too long
    if (description.length > 155) {
      description = description.substring(0, 152) + "...";
    }

    // Default image fallback
    const defaultImage =
      "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg";

    return {
      title: `${person.userName} | Sarasota Tech`,
      description,
      image: person.avatarUrl || user?.featuredImageUrl || defaultImage,
      url: `https://sarasota.tech/people/${username}`, // Use production domain
    };
  } catch (error) {
    console.error("Error fetching user for Open Graph:", error);
    return null;
  }
}

/**
 * Fetches event data for Open Graph meta tags
 * @param slug - The event slug from the URL
 * @returns Event data or null if not found
 */
export async function fetchEventForOpenGraph(
  slug: string,
): Promise<EventOpenGraphData | null> {
  try {
    const allEvents = await storage.getEvents();

    const event = allEvents.find(
      (e) => formatEventTitleForUrl(e.title, e.api_id) === slug,
    );

    if (!event) {
      return null;
    }

    let description = event.description || "";
    if (!description) {
      const eventDate = new Date(event.startTime).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      description = `Join us for ${event.title} on ${eventDate}.`;
    }

    // Strip HTML tags and entities first
    description = description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, "")
      .trim();

    // Then truncate if needed
    if (description.length > 155) {
      description = description.substring(0, 152) + "...";
    }

    const defaultImage =
      "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg";

    return {
      title: event.title || "Sarasota Tech Event",
      description,
      image: event.coverUrl || defaultImage,
      url: `https://sarasota.tech/event/${slug}`,
    };
  } catch (error) {
    console.error("Error fetching event for Open Graph:", error);
    return null;
  }
}

/**
 * Returns static Open Graph data for the Summit page
 * @returns Static Open Graph data for the Summit page
 */
export function fetchSummitForOpenGraph(): OpenGraphData {
  return {
    title: "Sarasota Tech Summit - Jan 15, 2026",
    description: "Florida's premier tech event.",
    image:
      "https://file-upload.replit.app/api/storage/images%2F1761584634963-Thumbnail-Main.png",
    url: "https://sarasota.tech/summit",
  };
}

/**
 * Injects Open Graph meta tags into HTML template
 * @param htmlTemplate - The original HTML template
 * @param ogData - The Open Graph data to inject
 * @returns Modified HTML with injected meta tags
 */
export function injectOpenGraphTags(
  htmlTemplate: string,
  ogData: OpenGraphData,
): string {
  let modifiedHtml = htmlTemplate;

  // Replace title - handle cases where title already includes "| Sarasota Tech"
  const titleContent = ogData.title.includes("| Sarasota Tech")
    ? ogData.title
    : `${ogData.title} | Sarasota Tech`;
  modifiedHtml = modifiedHtml.replace(
    /<title>([^<]*)<\/title>/,
    `<title>${titleContent}</title>`,
  );

  // Replace meta title
  modifiedHtml = modifiedHtml.replace(
    /<meta name="title" content="[^"]*">/,
    `<meta name="title" content="${ogData.title}">`,
  );

  // Replace meta description
  modifiedHtml = modifiedHtml.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${ogData.description}">`,
  );

  // Replace Open Graph tags
  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${ogData.title}">`,
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${ogData.description}">`,
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${ogData.image}">`,
  );

  // Add og:url if not present, or replace if present
  if (modifiedHtml.includes('property="og:url"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${ogData.url}">`,
    );
  } else {
    // Insert after og:image
    modifiedHtml = modifiedHtml.replace(
      /(<meta property="og:image" content="[^"]*">)/,
      `$1\n    <meta property="og:url" content="${ogData.url}">`,
    );
  }

  // Replace Twitter tags
  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:title" content="[^"]*">/,
    `<meta property="twitter:title" content="${ogData.title}">`,
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:description" content="[^"]*">/,
    `<meta property="twitter:description" content="${ogData.description}">`,
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:image" content="[^"]*">/,
    `<meta property="twitter:image" content="${ogData.image}">`,
  );

  return modifiedHtml;
}
