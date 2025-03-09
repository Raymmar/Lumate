import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  // If no username provided, use a prefix with fallbackId to indicate it's an ID
  if (!username) return `u-${fallbackId}`;

  // First normalize Unicode characters (e.g., 'š' -> 's')
  let normalized = username.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters and emojis
    .replace(/\s+/g, '-') // Replace spaces with single dash
    .toLowerCase()
    .trim();

  // If normalized string is empty after processing, use fallback format
  if (!normalized) return `u-${fallbackId}`;

  // Replace multiple consecutive hyphens with a single hyphen and trim from ends
  normalized = normalized.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');

  // Always append a portion of the API ID to ensure uniqueness
  // Take the first 8 characters of the fallbackId to keep URLs reasonable in length
  const idSuffix = fallbackId.slice(0, 8);

  return `${normalized}-${idSuffix}`;
}