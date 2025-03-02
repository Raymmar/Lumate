import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Person } from "@shared/schema";
import { Link } from "wouter";

interface RelatedPeopleProps {
  person: Person | null;
}

export function RelatedPeople({ person }: RelatedPeopleProps) {
  if (!person) {
    return (
      <div className="text-sm text-muted-foreground">
        No linked profile found
      </div>
    );
  }

  return (
    <Link href={`/admin/people/${person.api_id}`} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-accent">
      <Avatar>
        <AvatarImage src={person.avatarUrl || undefined} />
        <AvatarFallback>{person.fullName?.[0] || person.email[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">
          {person.fullName || person.email}
        </h4>
        {person.jobTitle && (
          <p className="text-sm text-muted-foreground">
            {person.jobTitle}
          </p>
        )}
      </div>
    </Link>
  );
}
