import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";
import { Redirect } from "wouter";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user } = useAuth();

  // If not logged in or no user, redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // If logged in but not an admin, redirect to home
  if (!user.isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}