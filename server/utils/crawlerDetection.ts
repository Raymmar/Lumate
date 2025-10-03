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
 * Checks if the URL is a company profile page that needs Open Graph injection
 * @param url - The request URL
 * @returns True if this is a company profile page
 */
export function isCompanyPage(url: string): boolean {
  return url.startsWith('/companies/') && url.length > 11; // More than just '/companies/'
}

/**
 * Checks if the URL is a user profile page that needs Open Graph injection
 * @param url - The request URL
 * @returns True if this is a user profile page
 */
export function isUserPage(url: string): boolean {
  return url.startsWith('/people/') && url.length > 8; // More than just '/people/'
}

/**
 * Checks if the URL is an event page that needs Open Graph injection
 * @param url - The request URL
 * @returns True if this is an event page
 */
export function isEventPage(url: string): boolean {
  return url.startsWith('/event/') && url.length > 7; // More than just '/event/'
}

/**
 * Check if a URL matches any supported page pattern for Open Graph
 * @param url - The request URL
 * @returns True if this is a supported page type
 */
export function isSupportedPage(url: string): boolean {
  return isPostPage(url) || isCompanyPage(url) || isUserPage(url) || isEventPage(url);
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

/**
 * Extracts the company slug from a company profile URL
 * @param url - The request URL (e.g., '/companies/example-company')
 * @returns The company slug or null if not a valid company URL
 */
export function extractCompanySlug(url: string): string | null {
  if (!isCompanyPage(url)) {
    return null;
  }
  
  // Remove '/companies/' prefix and any query parameters
  const slug = url.replace('/companies/', '').split('?')[0].split('#')[0];
  return slug || null;
}

/**
 * Extracts the username from a user profile URL
 * @param url - The request URL (e.g., '/people/john-smith')
 * @returns The username or null if not a valid user URL
 */
export function extractUsername(url: string): string | null {
  if (!isUserPage(url)) {
    return null;
  }
  
  // Remove '/people/' prefix and any query parameters
  const username = url.replace('/people/', '').split('?')[0].split('#')[0];
  return username || null;
}

/**
 * Extracts the event slug from an event URL
 * @param url - The request URL (e.g., '/event/monthly-tech-meetup')
 * @returns The event slug or null if not a valid event URL
 */
export function extractEventSlug(url: string): string | null {
  if (!isEventPage(url)) {
    return null;
  }
  
  // Remove '/event/' prefix and any query parameters
  const slug = url.replace('/event/', '').split('?')[0].split('#')[0];
  return slug || null;
}