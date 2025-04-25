import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface SubscriptionStatus {
  status: "active" | "inactive" | "canceled" | "past_due" | "unpaid" | "incomplete" | string;
  currentPeriodEnd?: number;
  subscriptionId?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  
  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/subscription-status");
      if (!response.ok) throw new Error("Failed to check subscription status");
      return await response.json();
    },
    enabled: !!user,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  const isPremium = user?.isAdmin || subscriptionStatus?.status === "active";
  
  // Function to start a subscription checkout
  const startSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error("No checkout URL received");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Subscription error:", error);
      throw error;
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    isPremium,
    startSubscription
  };
}