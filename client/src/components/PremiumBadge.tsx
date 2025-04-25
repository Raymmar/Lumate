import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Link } from "wouter";

interface PremiumBadgeProps {
  className?: string;
  asLink?: boolean;
}

export function PremiumBadge({ className, asLink = true }: PremiumBadgeProps) {
  const badge = (
    <Badge className={`bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 ${className || ""}`}>
      <Sparkles className="h-3 w-3" />
      Premium
    </Badge>
  );

  if (asLink) {
    return <Link href="/company-profile">{badge}</Link>;
  }

  return badge;
}