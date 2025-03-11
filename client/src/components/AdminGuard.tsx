import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";
import { Redirect } from "wouter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not logged in or no user, redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // If logged in but not an admin, redirect to home
  if (!Boolean(user.isAdmin)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}