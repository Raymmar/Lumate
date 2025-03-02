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
        // First get the person's api_id
        const personResponse = await fetch(`/api/people/${personId}`);
        if (!personResponse.ok) {
          console.error('Failed to fetch person:', personResponse.statusText);
          throw new Error('Failed to fetch person');
        }
        const personData = await personResponse.json();
        console.log('Person data with api_id:', personData);

        if (!personData.api_id) {
          console.error('No api_id found for person:', personData);
          return null;
        }

        // Then fetch the full profile using api_id
        const profileResponse = await fetch(`/api/people/profile/${personData.api_id}`);
        if (!profileResponse.ok) {
          console.error('Failed to fetch profile:', profileResponse.statusText);
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileResponse.json();
        console.log('Profile data retrieved:', profileData);
        return profileData;
      } catch (error) {
        console.error('Error fetching person/profile:', error);
        throw error;
      }
    },
    enabled: !!personId
  });

  if (error) {
    console.error('Query error:', error);
    return (
      <p className="text-sm text-destructive">
        Error loading profile data. Please try again later.
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
    console.log('No person/profile data found');
    return (
      <p className="text-sm text-muted-foreground">
        No linked profile found. This user hasn't been matched to a synced record yet.
        {personId ? ` (ID: ${personId})` : ''}
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