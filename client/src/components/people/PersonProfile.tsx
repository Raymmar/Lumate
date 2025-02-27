import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Person } from '@/components/people/PeopleDirectory';
import { CalendarCheck, Wallet } from 'lucide-react';

interface PersonProfileProps {
  personId: string;
}

export default function PersonProfile({ personId }: PersonProfileProps) {
  const { data: person, isLoading, error } = useQuery<Person>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      return response.json();
    }
  });

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-3">
        <p className="text-xs text-destructive">Failed to load person details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!person) {
    return <div>Person not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {person.avatarUrl ? (
            <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
          ) : (
            <AvatarFallback className="text-xl">
              {person.userName
                ? person.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "?"}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{person.userName || "Anonymous"}</h1>
          <p className="text-muted-foreground">{person.email}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium">Events checked in</dt>
                  <dd className="text-2xl font-bold">{person.eventCheckedInCount}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium">Revenue generated</dt>
                  <dd className="text-2xl font-bold">${(person.revenueUsdCents / 100).toFixed(2)}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd>{person.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Member since</dt>
                <dd>{new Date(person.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                <dd className="font-mono text-sm">{person.api_id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}