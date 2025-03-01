import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import { format } from "date-fns";

interface MemberPreviewProps {
  member: User;
}

export function MemberPreview({ member }: MemberPreviewProps) {
  const { toast } = useToast();
  const initials = member.displayName?.split(' ').map(n => n[0]).join('') || member.email[0].toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{member.displayName || 'No display name'}</h2>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant={member.isVerified ? "default" : "secondary"}>
          {member.isVerified ? "Verified" : "Pending"}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-medium">Member Information</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Member since</span>
            <span>{format(new Date(member.createdAt), 'PPP')}</span>
          </div>
          {/* Add more member details as needed */}
        </CardContent>
      </Card>
    </div>
  );
}
