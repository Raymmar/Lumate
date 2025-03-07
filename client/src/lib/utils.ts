import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  if (!username) return fallbackId;

  // First normalize Unicode characters (e.g., 'š' -> 's')
  const normalized = username.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .toLowerCase();

  // Replace multiple spaces/dashes with single dash
  return normalized.replace(/[\s_-]+/g, '-');
}