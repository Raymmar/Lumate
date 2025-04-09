import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export function formatCompanyNameForUrl(companyName: string | null, fallbackId: string): string {
  // If no company name provided, use a prefix with fallbackId to indicate it's an ID
  if (!companyName) return `c-${fallbackId}`;

  // Process the company name to make it URL-friendly
  let processed = companyName
    .replace(/\./g, '') // Remove periods
    .replace(/&/g, 'and') // Replace & with 'and'
    .normalize('NFKD') // Normalize Unicode characters (decompose)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces, keep hyphens
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens

  // If normalized string is empty after processing, use fallback format
  if (!processed) {
    return `c-${fallbackId}`;
  }

  // Clean up any multiple hyphens and trim from ends
  processed = processed
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end

  return processed;
}