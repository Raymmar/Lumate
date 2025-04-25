import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function PremiumBadge() {
  return (
    <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 flex items-center gap-1">
      <Sparkles className="h-3 w-3" />
      Premium
    </Badge>
  );
}