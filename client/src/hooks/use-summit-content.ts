import { useQuery } from "@tanstack/react-query";
import type { Post, Sponsor } from "@shared/schema";
import { presentationsQueryOptions, timeBlocksQueryOptions } from "@/components/agenda/agendaQueries";
import { PUBLIC_POSTS_QUERY_KEY } from "@/components/bulletin/PublicPostsTable";

/**
 * Whether a summit year has agenda items, linked news posts and sponsors.
 * Uses the same query keys as the sections themselves so the data is fetched once
 * and shared. The year comes from the URL so these can load alongside the summit.
 */
export function useSummitContent(year: number | null, summitId: number | undefined) {
  const enabled = year !== null;
  const summitYear = year ?? undefined;

  const timeBlocks = useQuery({ ...timeBlocksQueryOptions(summitYear), enabled });
  const presentations = useQuery({ ...presentationsQueryOptions(summitYear), enabled });
  const posts = useQuery<{ posts: Post[] }>({ queryKey: PUBLIC_POSTS_QUERY_KEY });
  const sponsors = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: [`/api/sponsors?year=${year}`],
    enabled,
  });

  const hasAgenda =
    (timeBlocks.data?.timeBlocks.length ?? 0) > 0 || (presentations.data?.presentations.length ?? 0) > 0;
  const hasNews =
    summitId !== undefined && (posts.data?.posts ?? []).some((post) => post.summitId === summitId);
  // The grid renders historical unknown tiers too. Keep its section visible on
  // catalog failure so that its retry/error state is not silently hidden.
  const hasSponsors = (sponsors.data?.sponsors.length ?? 0) > 0;

  const isLoading =
    enabled && (timeBlocks.isLoading || presentations.isLoading || posts.isLoading || sponsors.isLoading);

  return { hasAgenda, hasNews, hasSponsors, isLoading };
}
