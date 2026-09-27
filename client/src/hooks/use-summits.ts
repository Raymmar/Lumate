import { useQuery } from "@tanstack/react-query";
import type { Summit } from "@shared/schema";

export const SUMMITS_QUERY_KEY = ["/api/summits"] as const;

/** All summits visible to the viewer (admins also see drafts), newest first. */
export function useSummits() {
  return useQuery<{ summits: Summit[] }, Error, Summit[]>({
    queryKey: SUMMITS_QUERY_KEY,
    select: (data) => data.summits,
    staleTime: 60000,
  });
}

/** The featured summit: marked current and published, else the latest published. */
export function useCurrentSummit() {
  return useQuery<{ summit: Summit | null }, Error, Summit | null>({
    queryKey: ["/api/summits", "current"],
    queryFn: async () => {
      const res = await fetch("/api/summits/current", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch current summit");
      return res.json();
    },
    select: (data) => data.summit,
    staleTime: 60000,
  });
}

/** A single summit by year. Resolves to null when it doesn't exist or is hidden. */
export function useSummit(year: number | null) {
  return useQuery<Summit | null>({
    queryKey: ["/api/summits", year],
    enabled: year !== null,
    queryFn: async () => {
      const res = await fetch(`/api/summits/${year}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch summit");
      const data = (await res.json()) as { summit: Summit };
      return data.summit;
    },
    staleTime: 60000,
  });
}

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Display date for a summit, preferring the admin's label. */
export function formatSummitDate(summit: Summit): string {
  if (summit.dateLabel) return summit.dateLabel;
  if (!summit.startDate) return String(summit.year);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const start = parseLocalDate(summit.startDate).toLocaleDateString("en-US", opts);
  if (!summit.endDate || summit.endDate === summit.startDate) return start;
  return `${start} – ${parseLocalDate(summit.endDate).toLocaleDateString("en-US", opts)}`;
}

/** True once the summit's last day has passed. */
export function isSummitPast(summit: Summit): boolean {
  const last = summit.endDate || summit.startDate;
  if (!last) return false;
  const end = parseLocalDate(last);
  end.setDate(end.getDate() + 1);
  return end.getTime() <= Date.now();
}
