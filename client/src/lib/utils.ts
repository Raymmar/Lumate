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

  // First try just the clean username
  // The API will handle collisions by responding with a list of similar usernames
  // Only then will we append the ID suffix
  return normalized;
}