import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { queryClient } from "./queryClient"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Force a complete application reset:
 * 1. Clears React Query cache
 * 2. Removes localStorage caches
 * 3. Performs a hard browser navigation refresh
 * 
 * This is the nuclear option to completely restart the app
 * and ensure all data is freshly loaded from the server
 */
export function forceCompleteReset() {
  console.log("EXECUTING NUCLEAR RESET OPTION");
  
  // 1. Clear ALL caches: React Query and anything else in memory
  queryClient.clear();
  
  // 2. Clear ALL localStorage
  try {
    localStorage.clear();  // More aggressive - clear everything
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  
  // 3. Force a full navigation with flags to prevent any caching
  const timestamp = new Date().getTime();
  
  // Use a much more definitive page reload approach that's guaranteed to work
  // First set a flag in sessionStorage that we'll check on page load
  try {
    sessionStorage.setItem('force_complete_refresh', 'true');
    sessionStorage.setItem('refresh_timestamp', timestamp.toString());
  } catch (e) {
    console.error('Error setting sessionStorage:', e);
  }
  
  // Direct window replacement - completely bypasses any SPA routing
  // This is the most aggressive refresh you can do in a browser
  console.log("EXECUTING HARD BROWSER RELOAD");
  window.location.replace(window.location.origin + '?complete_refresh=' + timestamp);
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  // If no username provided, use a prefix with fallbackId to indicate it's an ID
  if (!username) return `u-${fallbackId}`;

  console.log('Original username:', username);

  // Special handling for titles and accented characters
  let processed = username
    .replace(/Dr\./i, 'dr') // Replace "Dr." with "dr"
    .replace(/Mr\./i, 'mr') // Handle Mr. prefix
    .replace(/Mrs\./i, 'mrs') // Handle Mrs. prefix
    .replace(/Ms\./i, 'ms') // Handle Ms. prefix
    .replace(/\./g, '') // Remove remaining periods
    .normalize('NFKD') // Normalize Unicode characters (decompose)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces, keep hyphens
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens

  console.log('After normalization and accent removal:', processed);

  // If normalized string is empty after processing, use fallback format
  if (!processed) {
    console.log('Empty processed string, using fallback');
    return `u-${fallbackId}`;
  }

  // Clean up any multiple hyphens and trim from ends
  processed = processed
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end

  console.log('Final processed username:', processed);
  return processed;
}