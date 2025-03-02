import { useQuery } from "@tanstack/react-query";
import { Person } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedPeopleProps {
  userId: number;
  userEmail?: string; // Add email prop for better matching
}

export function RelatedPeople({ userId, userEmail }: RelatedPeopleProps) {
  const { data: relatedPeople, isLoading } = useQuery<Person[]>({
    queryKey: ['/api/users', userId, 'related-people'],
    queryFn: async () => {
      console.log('Fetching related people for user:', { userId, userEmail });
      const response = await fetch(`/api/users/${userId}/related-people${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`);
      if (!response.ok) {
        console.error('Failed to fetch related people:', response.statusText);
        throw new Error('Failed to fetch related people');
      }
      const data = await response.json();
      console.log('Related people data:', data);
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!relatedPeople?.length) {
    return (
      <p className="text-sm text-muted-foreground">No related people found. This could mean the user's email hasn't been matched to any synced records yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {relatedPeople.map((person) => (
        <Link
          key={person.api_id}
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
      ))}
    </div>
  );
}