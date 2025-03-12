import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  updateUser: (userData: User) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function useLogoutMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });

      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      console.log('🔄 Auth Hook - Fetching user data...');
      const response = await fetch("/api/auth/me", {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();

      // Debug log the exact response data
      console.log('✅ Auth Hook - User data received:', {
        id: data.id,
        email: data.email,
        subscriptionStatus: {
          value: data.subscriptionStatus,
          type: typeof data.subscriptionStatus,
          rawValue: String(data.subscriptionStatus)
        },
        subscriptionId: data.subscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        isAdmin: data.isAdmin,
        fullData: data // Log complete response
      });

      return data;
    },
    staleTime: 0, // Don't cache the data
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const userData = data.user || data;
      console.log('✅ Login successful - user data:', userData);

      queryClient.setQueryData(["/api/auth/me"], userData);
    },
    onError: (error: Error) => {
      console.error('❌ Login error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const updateUser = (userData: User) => {
    console.log('🔄 Updating user data:', {
      id: userData.id,
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionId: userData.subscriptionId,
      stripeCustomerId: userData.stripeCustomerId
    });
    queryClient.setQueryData(["/api/auth/me"], userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logoutMutation: useLogoutMutation(),
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}