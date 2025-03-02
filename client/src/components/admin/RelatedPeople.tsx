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
    queryKey: ['/api/users', userId, 'linked-person'],
    queryFn: async () => {
      if (!personId) {
        console.log('No personId provided, skipping fetch');
        return null;
      }

      console.log('Fetching linked person record:', { userId, personId });
      try {
        // First get the person record to get the api_id
        const response = await fetch(`/api/users/${userId}/linked-person`);
        if (!response.ok) {
          console.error('Failed to fetch linked person:', response.statusText);
          throw new Error('Failed to fetch linked person');
        }
        const data = await response.json();
        console.log('Linked person data retrieved:', data);

        // Now fetch the full profile using api_id
        if (data && data.api_id) {
          const profileResponse = await fetch(`/api/people/by-api-id/${data.api_id}`);
          if (!profileResponse.ok) {
            console.error('Failed to fetch profile data:', profileResponse.statusText);
            throw new Error('Failed to fetch profile data');
          }
          const profileData = await profileResponse.json();
          console.log('Profile data retrieved:', profileData);
          return profileData;
        }
        return data;
      } catch (error) {
        console.error('Error fetching linked person:', error);
        throw error;
      }
    },
    enabled: !!personId
  });

  if (error) {
    console.error('Query error:', error);
    return (
      <p className="text-sm text-destructive">
        Error loading linked person data. Please try again later.
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
        No linked person record found. This user hasn't been matched to a synced record yet.
        {personId ? ` (Attempted to load person ID: ${personId})` : ''}
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