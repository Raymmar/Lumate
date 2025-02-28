import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface AdminBadgeProps {
  className?: string;
  asLink?: boolean;
}

export function AdminBadge({ className, asLink }: AdminBadgeProps) {
  const badge = (
    <Badge variant="secondary" className={className}>
      <Shield className="h-3 w-3 mr-1" />
      Admin
    </Badge>
  );

  if (asLink) {
    return <Link href="/admin">{badge}</Link>;
  }

  return badge;
}