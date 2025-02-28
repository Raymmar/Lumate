import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";
import { Redirect } from "wouter";

// List of admin emails - in a real application, this would be in a database
export const ADMIN_EMAILS = [
  "admin@example.com",
  "me@raymmar.com",
  // Add more admin emails here
];

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user } = useAuth();

  // If not logged in or no user email, redirect to login
  if (!user?.email) {
    return <Redirect to="/login" />;
  }

  // If logged in but not an admin, redirect to home
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}