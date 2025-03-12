import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth();

  // While loading, show children to prevent flicker
  if (isLoading) {
    return <>{children}</>;
  }

  if (!user) {
    return fallback || null;
  }

  return <>{children}</>;
}