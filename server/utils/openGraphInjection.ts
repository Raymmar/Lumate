import { db } from "../db";
import { posts, postTags, tags } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

interface PostOpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
}

/**
 * Helper function to format post title for URL (matches client-side logic)
 */
function formatPostTitleForUrl(title: string | null, fallbackId: string): string {
  if (!title) return `p-${fallbackId}`;
  
  let processed = title
    .replace(/\./g, '')
    .replace(/&/g, 'and')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  
  if (!processed) {
    return `p-${fallbackId}`;
  }
  
  processed = processed
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return processed;
}

/**
 * Fetches post data for Open Graph meta tags
 * @param slug - The post slug from the URL
 * @returns Post data or null if not found
 */
export async function fetchPostForOpenGraph(slug: string): Promise<PostOpenGraphData | null> {
  try {
    // First get all posts to find the one with matching slug
    const allPosts = await db
      .select()
      .from(posts);
    
    // Find post by matching slug
    const post = allPosts.find(p => formatPostTitleForUrl(p.title, p.id.toString()) === slug);
    
    if (!post) {
      return null;
    }

    // Get creator info
    const creator = await storage.getUser(post.creatorId);

    // Use summary as description, fallback to truncated body if no summary
    let description = post.summary || '';
    if (!description && post.body) {
      // Strip HTML tags and truncate
      description = post.body
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, '') // Remove HTML entities
        .trim()
        .substring(0, 155) + '...'; // Truncate to ideal meta description length
    }
    
    // Fallback description
    if (!description) {
      description = 'Read this article on Sarasota Tech community platform.';
    }

    // Default image fallback
    const defaultImage = 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg';
    
    return {
      title: post.title || 'Sarasota Tech Article',
      description,
      image: post.featuredImage || defaultImage,
      url: `https://sarasota.tech/post/${slug}` // Use production domain
    };
  } catch (error) {
    console.error('Error fetching post for Open Graph:', error);
    return null;
  }
}

/**
 * Injects Open Graph meta tags into HTML template
 * @param htmlTemplate - The original HTML template
 * @param postData - The post data to inject
 * @returns Modified HTML with injected meta tags
 */
export function injectOpenGraphTags(htmlTemplate: string, postData: PostOpenGraphData): string {
  let modifiedHtml = htmlTemplate;
  
  // Replace title
  modifiedHtml = modifiedHtml.replace(
    /<title>([^<]*)<\/title>/,
    `<title>${postData.title} | Sarasota Tech</title>`
  );
  
  // Replace meta title
  modifiedHtml = modifiedHtml.replace(
    /<meta name="title" content="[^"]*">/,
    `<meta name="title" content="${postData.title}">`
  );
  
  // Replace meta description
  modifiedHtml = modifiedHtml.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${postData.description}">`
  );
  
  // Replace Open Graph tags
  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${postData.title}">`
  );
  
  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${postData.description}">`
  );
  
  modifiedHtml = modifiedHtml.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${postData.image}">`
  );
  
  // Add og:url if not present, or replace if present
  if (modifiedHtml.includes('property="og:url"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${postData.url}">`
    );
  } else {
    // Insert after og:image
    modifiedHtml = modifiedHtml.replace(
      /(<meta property="og:image" content="[^"]*">)/,
      `$1\n    <meta property="og:url" content="${postData.url}">`
    );
  }
  
  // Replace Twitter tags
  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:title" content="[^"]*">/,
    `<meta property="twitter:title" content="${postData.title}">`
  );
  
  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:description" content="[^"]*">/,
    `<meta property="twitter:description" content="${postData.description}">`
  );
  
  modifiedHtml = modifiedHtml.replace(
    /<meta property="twitter:image" content="[^"]*">/,
    `<meta property="twitter:image" content="${postData.image}">`
  );
  
  return modifiedHtml;
}