import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsernameForUrl(username: string | null, fallbackId: string): string {
  if (!username) return fallbackId;
  return username.trim().toLowerCase().replace(/\s+/g, '-');
}