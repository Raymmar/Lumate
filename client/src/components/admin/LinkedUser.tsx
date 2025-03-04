import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface LinkedUserProps {
  user?: User | null;
}

export function LinkedUser({ user }: LinkedUserProps) {
  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        No linked user account found
      </div>
    );
  }

  const initials = user.displayName?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase();

  return (
    <Link href={`/members/${user.id}`} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-accent">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium leading-none">
            {user.displayName || user.email}
          </h4>
          {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {user.isVerified ? 'Verified Account' : 'Pending Verification'}
        </p>
      </div>
    </Link>
  );
}