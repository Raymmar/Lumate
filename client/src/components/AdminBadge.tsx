import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminBadgeProps {
  className?: string;
}

export function AdminBadge({ className }: AdminBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      <Shield className="h-3 w-3 mr-1" />
      Admin
    </Badge>
  );
}
