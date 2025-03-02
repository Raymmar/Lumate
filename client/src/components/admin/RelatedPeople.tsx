import { useQuery } from "@tanstack/react-query";
import type { Person } from "@/components/people/PeopleDirectory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPeopleProps {
  userId: number;
  personId?: number;
}

export function RelatedPeople({ userId, personId }: RelatedPeopleProps) {
  console.log('RelatedPeople component props:', { userId, personId });

  const { data: person, isLoading, error } = useQuery<Person | null>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      if (!personId) {
        console.log('No personId provided, skipping fetch');
        return null;
      }

      console.log('Fetching person record:', { personId });
      try {
        const response = await fetch(`/api/people/${personId}`);
        if (!response.ok) {
          console.error('Failed to fetch person:', response.statusText);
          throw new Error('Failed to fetch person');
        }
        const data = await response.json();
        console.log('Person data retrieved:', data);
        return data;
      } catch (error) {
        console.error('Error fetching person:', error);
        throw error;
      }
    },
    enabled: !!personId
  });

  if (error) {
    console.error('Query error:', error);
    return (
      <p className="text-sm text-destructive">
        Error loading person data. Please try again later.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!person) {
    console.log('No person data found');
    return (
      <p className="text-sm text-muted-foreground">
        No person record found. This user hasn't been matched to a synced record yet.
        {personId ? ` (Attempted to load ID: ${personId})` : ''}
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