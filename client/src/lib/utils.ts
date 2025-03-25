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
  // 1. Clear all React Query caches
  queryClient.clear();
  
  // 2. Clear any localStorage caches that might be relevant
  try {
    // Add app-specific cache keys here if needed
    localStorage.removeItem('last_data_refresh');
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  
  // 3. Force a full page navigation with cache-busting parameter
  const timestamp = new Date().getTime();
  
  // Use replaceState to clear the history entry (so back button doesn't revert)
  window.history.replaceState(null, '', window.location.pathname);
  
  // Force a hard navigation to root with cache busting
  window.location.href = window.location.origin + '?force_refresh=' + timestamp;
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