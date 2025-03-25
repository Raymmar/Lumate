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
 * This is the EXTREME nuclear option to completely restart the app
 * and ensure all data is freshly loaded from the server
 */
export function forceCompleteReset() {
  console.log("!!! EXECUTING EXTREME NUCLEAR RESET OPTION !!!");
  
  // 1. Clear ALL caches: React Query and anything else in memory
  try {
    queryClient.clear();
    queryClient.resetQueries();
    console.log("React Query cache cleared");
  } catch (err) {
    console.error("Error clearing React Query cache:", err);
  }
  
  // 2. Clear ALL storage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log("Browser storage cleared");
    
    // Set a special flag that we'll look for on page load
    sessionStorage.setItem('EXTREME_RESET', 'true');
    sessionStorage.setItem('RESET_TIMESTAMP', Date.now().toString());
  } catch (e) {
    console.error('Error clearing browser storage:', e);
  }
  
  console.log("!!! EXECUTING HARD BROWSER RELOAD WITH ALL CACHES DISABLED !!!");
  
  // THE MOST EXTREME APPROACH: Using the window.location.href assignment with 
  // cache-busting parameters AND using the reload(true) call right after
  try {
    // First try the most aggressive combination possible:
    // 1. Remove any hash or search params that might affect routing
    const baseUrl = window.location.protocol + '//' + window.location.host + '/';
    
    // 2. Add cache busting with multiple parameters to ensure it's totally unique
    const bustCache = 'PURGE_CACHE=' + Date.now() + '&force_refresh=true&new_session=true&no_cache=' + Math.random();
    
    // 3. Replace the current URL with a clean, cache-busted URL
    window.location.href = baseUrl + '?' + bustCache;
    
    // 4. ALSO call reload(true) which tells browsers to bypass the cache
    // This is a belt-and-suspenders approach
    setTimeout(() => {
      console.log("FORCING RELOAD WITH CACHE BYPASS");
      window.location.reload(true);
    }, 100);
  } catch (e) {
    console.error('Error during extreme reset:', e);
    
    // Fallback - use the most basic approach if the sophisticated one fails
    window.location.reload(true);
  }
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