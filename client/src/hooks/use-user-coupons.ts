import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { TicketCoupon } from "@shared/summitTicket";

export function useUserCoupons() {
  const { user, isLoading, error } = useAuth();
  return useQuery<{ coupons: TicketCoupon[]; hasUnclaimedCoupons: boolean }>({
    queryKey: ["/api/user/coupons", user?.id],
    enabled: !!user && !isLoading && !error,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/user/coupons", {
        credentials: "include", cache: "no-store", signal,
      });
      if (!response.ok) throw new Error("Couldn't check your event coupons.");
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    refetchInterval: 60_000,
  });
}
