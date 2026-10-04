import { useQuery } from "@tanstack/react-query";
import type { SponsorWithHistory } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export const ALL_SPONSORS_QUERY_KEY = ["/api/sponsors/all"] as const;

/** Every sponsor with its sponsorship history (admin only). */
export function useAllSponsors(enabled = true) {
  return useQuery<{ sponsors: SponsorWithHistory[]; currentYear: number }>({
    queryKey: ALL_SPONSORS_QUERY_KEY,
    enabled,
  });
}

/** Refreshes every sponsor list (all years) and summits, which show the presenting sponsor. */
export function invalidateSponsorQueries() {
  return Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/sponsors"),
    }),
    queryClient.invalidateQueries({ queryKey: ["/api/summits"] }),
  ]);
}

/** Turns an apiRequest error ("409: {\"error\":\"...\"}") into the server's message. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^\d{3}: ([\s\S]*)$/);
  if (!match) return error.message || fallback;
  try {
    const body = JSON.parse(match[1]);
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return match[1] || fallback;
  }
}

/** Years a sponsor sponsored, oldest first, e.g. "2025, 2026". */
export function formatSponsorYears(sponsor: SponsorWithHistory): string {
  return sponsor.sponsorships
    .map((s) => s.year)
    .sort((a, b) => a - b)
    .join(", ");
}
