import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  // If no username provided, use a prefix with fallbackId to indicate it's an ID
  if (!username) return `u-${fallbackId}`;

  console.log('Original username:', username);

  // Special handling for titles (Dr., Mr., Mrs., etc.)
  let processed = username
    .replace(/Dr\./i, 'dr') // Replace "Dr." with "dr"
    .replace(/\./g, '') // Remove remaining periods
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces, keep hyphens
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-'); // Replace spaces with hyphens

  console.log('Processed username:', processed);

  // If normalized string is empty after processing, use fallback format
  if (!processed) return `u-${fallbackId}`;

  // Clean up any multiple hyphens and trim from ends
  processed = processed
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end

  console.log('Final processed username:', processed);
  return processed;
}