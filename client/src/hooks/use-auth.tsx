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
  updateUser: (userData: User) => void; // Add the updateUser function type
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
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      
      console.log("TRIGGERING LOGOUT NUCLEAR RESET");
      
      // Check if the direct refresh method is available
      if (window._forceHardRefresh) {
        console.log("USING DIRECT BROWSER REFRESH METHOD FOR LOGOUT");
        // Use the most direct approach possible, but delay slightly to show toast
        setTimeout(() => {
          window._forceHardRefresh();
        }, 300);
      } else {
        // Fallback to previous approach
        console.log("FALLING BACK TO UTILS RESET METHOD FOR LOGOUT");
        import('@/lib/utils').then(({ forceCompleteReset }) => {
          setTimeout(() => {
            forceCompleteReset();
          }, 300);
        });
      }
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
      const response = await fetch("/api/auth/me", {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      const data = await response.json();
      return data;
    },
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
    onSuccess: () => {
      console.log("TRIGGERING LOGIN NUCLEAR RESET");
      
      // Check if the direct refresh method is available (injected by LoginPage)
      if (window._forceHardRefresh) {
        console.log("USING DIRECT BROWSER REFRESH METHOD");
        // Use the most direct approach possible
        window._forceHardRefresh();
      } else {
        // Fallback to previous approach
        console.log("FALLING BACK TO UTILS RESET METHOD");
        import('@/lib/utils').then(({ forceCompleteReset }) => {
          setTimeout(() => {
            forceCompleteReset();
          }, 300);
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useLogoutMutation();

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  // Add the updateUser function implementation
  const updateUser = (userData: User) => {
    queryClient.setQueryData(["/api/auth/me"], userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        login,
        logoutMutation,
        updateUser, // Include the updateUser function in the context
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