import { useQuery } from "@tanstack/react-query";
import type { Person } from "@/components/people/PeopleDirectory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPeopleProps {
  userId: number;
  personId?: number; // Changed to use personId instead of email
}

export function RelatedPeople({ userId, personId }: RelatedPeopleProps) {
  const { data: person, isLoading } = useQuery<Person | null>({
    queryKey: ['/api/users', userId, 'linked-person'],
    queryFn: async () => {
      if (!personId) return null;
      console.log('Fetching linked person record:', { userId, personId });
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) {
        console.error('Failed to fetch linked person:', response.statusText);
        throw new Error('Failed to fetch linked person');
      }
      const data = await response.json();
      console.log('Linked person data:', data);
      return data;
    },
    enabled: !!personId // Only run query if personId is provided
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!person) {
    return (
      <p className="text-sm text-muted-foreground">
        No linked person record found. This user hasn't been matched to a synced record yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Link
        href={`/people/${person.api_id}`}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Avatar className="h-8 w-8">
          {person.avatarUrl ? (
            <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
          ) : (
            <AvatarFallback>
              {person.userName
                ? person.userName.split(" ").map((n) => n[0]).join("")
                : "?"}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="text-sm font-medium">{person.userName || "Anonymous"}</p>
          {person.organizationName && (
            <p className="text-xs text-muted-foreground">{person.organizationName}</p>
          )}
        </div>
      </Link>
    </div>
  );
}