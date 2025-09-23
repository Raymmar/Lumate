/**
 * Utility for detecting social media crawlers and bots
 * Used to serve optimized HTML with Open Graph meta tags
 */

const CRAWLER_USER_AGENTS = [
  // Facebook
  'facebookexternalhit',
  'Facebot',
  
  // Twitter
  'Twitterbot',
  
  // LinkedIn
  'LinkedInBot',
  'linkedin',
  
  // Discord
  'Discordbot',
  
  // Slack
  'Slackbot',
  
  // WhatsApp
  'WhatsApp',
  
  // Telegram
  'TelegramBot',
  
  // General crawlers that might be used for link previews
  'bingbot',
  'googlebot',
  'slurp', // Yahoo
  'DuckDuckBot',
  'AppleBot',
  'ia_archiver', // Internet Archive
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'SeznamBot',
  'facebookcatalog',
  'developers.google.com/+/web/snippet'
];

/**
 * Checks if the request is from a social media crawler or bot
 * @param userAgent - The User-Agent header from the request
 * @returns True if the request is from a crawler
 */
export function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false;
  }

  const userAgentLower = userAgent.toLowerCase();
  
  return CRAWLER_USER_AGENTS.some(crawlerAgent => 
    userAgentLower.includes(crawlerAgent.toLowerCase())
  );
}

/**
 * Checks if the URL is a post page that needs Open Graph injection
 * @param url - The request URL
 * @returns True if this is a post page
 */
export function isPostPage(url: string): boolean {
  return url.startsWith('/post/') && url.length > 6; // More than just '/post/'
}

/**
 * Extracts the post slug from a post URL
 * @param url - The request URL (e.g., '/post/season-3-preview-sarasota-tech')
 * @returns The post slug or null if not a valid post URL
 */
export function extractPostSlug(url: string): string | null {
  if (!isPostPage(url)) {
    return null;
  }
  
  // Remove '/post/' prefix and any query parameters
  const slug = url.replace('/post/', '').split('?')[0].split('#')[0];
  return slug || null;
}