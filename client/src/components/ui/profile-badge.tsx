import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProfileBadgeProps {
  name: string;
  variant?: "outline" | "default" | "secondary";
  className?: string;
  icon?: React.ReactNode;
}

export function ProfileBadge({ 
  name, 
  variant = "secondary",
  className,
  icon
}: ProfileBadgeProps) {
  return (
    <Badge 
      variant={variant} 
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs font-medium",
        className
      )}
    >
      {icon}
      {name}
    </Badge>
  );
}
