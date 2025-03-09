import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  // If no username provided, use a prefix with fallbackId to indicate it's an ID
  if (!username) return `u-${fallbackId}`;

  // Pre-process: Replace periods with spaces and normalize Unicode characters
  let normalized = username
    .replace(/\./g, ' ') // Replace periods with spaces
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces, keep hyphens
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces into single space

  // If normalized string is empty after processing, use fallback format
  if (!normalized) return `u-${fallbackId}`;

  // Replace single spaces with hyphens and clean up any resulting multiple hyphens
  normalized = normalized
    .replace(/\s/g, '-')
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end

  return normalized;
}