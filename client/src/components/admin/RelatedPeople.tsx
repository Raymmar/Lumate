import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Person } from "@shared/schema";
import { Link } from "wouter";

interface RelatedPeopleProps {
  person?: Person | null;  // Change back to using the full person object
}

export function RelatedPeople({ person }: RelatedPeopleProps) {
  if (!person) {
    return (
      <div className="text-sm text-muted-foreground">
        No linked profile found
      </div>
    );
  }

  const initials = person.userName?.split(' ').map(n => n[0]).join('') || person.email[0].toUpperCase();

  return (
    <Link href={`/admin/people/${person.api_id}`} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-accent">
      <Avatar>
        {person.avatarUrl ? (
          <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
        ) : (
          <AvatarFallback>{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">
          {person.userName || person.email}
        </h4>
        {person.organizationName && (
          <p className="text-sm text-muted-foreground">
            {person.organizationName}
          </p>
        )}
      </div>
    </Link>
  );
}