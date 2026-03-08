import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface SyncStatus {
  syncing: boolean;
  services: string[];
}

export function useSyncStatus() {
  const queryClient = useQueryClient();
  const wasSyncingRef = useRef(false);

  const { data } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    queryFn: async () => {
      const response = await fetch("/api/sync/status");
      if (!response.ok) throw new Error("Failed to fetch sync status");
      return response.json();
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const isSyncing = data?.syncing ?? false;

  useEffect(() => {
    if (wasSyncingRef.current && !isSyncing) {
      queryClient.invalidateQueries({ queryKey: ["/api/public/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.includes("/attendees");
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/member-stats"] });
    }
    wasSyncingRef.current = isSyncing;
  }, [isSyncing, queryClient]);

  return { isSyncing, services: data?.services ?? [] };
}
