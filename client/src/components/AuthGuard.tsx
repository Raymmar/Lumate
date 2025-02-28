import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user } = useAuth();
  
  if (!user) {
    return fallback || null;
  }
  
  return <>{children}</>;
}
