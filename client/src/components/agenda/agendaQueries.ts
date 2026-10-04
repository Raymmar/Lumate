import type { PresentationWithSpeakers, TimeBlockWithPresentations } from "@shared/schema";

async function fetchAgendaData<T>(path: string, summitYear?: number): Promise<T> {
  const url = summitYear ? `${path}?year=${summitYear}` : path;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

/**
 * Query options for agenda data, shared by the agenda section and the summit page
 * so both read from the same cache entry.
 * Keys keep the base path first so existing ["/api/time-blocks"] invalidations still match.
 */
export function timeBlocksQueryOptions(summitYear?: number) {
  return {
    queryKey: summitYear ? ["/api/time-blocks", { year: summitYear }] : ["/api/time-blocks"],
    queryFn: () => fetchAgendaData<{ timeBlocks: TimeBlockWithPresentations[] }>("/api/time-blocks", summitYear),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  };
}

export function presentationsQueryOptions(summitYear?: number) {
  return {
    queryKey: summitYear ? ["/api/presentations", { year: summitYear }] : ["/api/presentations"],
    queryFn: () => fetchAgendaData<{ presentations: PresentationWithSpeakers[] }>("/api/presentations", summitYear),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  };
}
