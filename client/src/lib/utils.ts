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
    .replace(/[^\w\s-]/g, '') // Remove special characters and emojis
    .replace(/\s+/g, '-') // Replace spaces with single dash
    .toLowerCase()
    .trim();

  // If normalized string is empty after processing, return fallbackId
  if (!normalized) return fallbackId;

  // Replace multiple dashes with single dash and trim dashes from ends
  return normalized.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}