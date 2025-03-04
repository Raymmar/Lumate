import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Person } from '@/components/people/PeopleDirectory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { AuthGuard } from "@/components/AuthGuard";
import { AdminBadge } from "@/components/AdminBadge";
import { CalendarDays, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface PersonProfileProps {
  personId: string;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

interface Event {
  id: number;
  api_id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  coverUrl: string | null;
  url: string | null;
}

function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/5 rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-semibold text-foreground">{value}</p>
          {description && (
            <span className="text-xs text-muted-foreground">({description})</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PersonProfile({ personId }: PersonProfileProps) {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      return response.json();
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/people', personId, 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch person stats');
      return response.json();
    }
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/people', personId, 'events'],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    }
  });

  const { data: userStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/auth/check-profile', personId],
    queryFn: async () => {
      const response = await fetch(`/api/auth/check-profile/${personId}`);
      if (!response.ok) throw new Error('Failed to check profile status');
      return response.json();
    }
  });


  const isLoading = personLoading || statsLoading || statusLoading || eventsLoading;
  const error = personError;

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

  const isAdmin = Boolean(user?.isAdmin);
  const isOwnProfile = user?.api_id === person?.api_id;
  const isClaimed = userStatus?.isClaimed || isOwnProfile;
  const isProfileAdmin = Boolean(person.isAdmin);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {person.userName || "Anonymous"}
                {person.role && (
                  <Badge variant="secondary" className="ml-2">
                    {person.role}
                  </Badge>
                )}
                {isProfileAdmin && <AdminBadge />}
              </h1>
              <div className="flex items-center gap-2">
                <AuthGuard>
                  <p className="text-muted-foreground">{person.email}</p>
                </AuthGuard>
              </div>
              <div className="mt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  + Add Tag
                </Button>
              </div>
            </div>
          </div>

          {!user && (
            <ClaimProfileDialog
              personId={personId}
              trigger={
                <Button
                  variant={isClaimed ? "outline" : "default"}
                  className={isClaimed ? "cursor-default" : ""}
                  disabled={isClaimed}
                >
                  {isClaimed ? "Profile Claimed" : "Claim Profile"}
                </Button>
              }
            />
          )}
        </div>

        <Card className="cursor-pointer" onClick={() => window.location.href = `mailto:${person.email}`}>
          <CardContent>
            <dl className="pt-4">
              {person.fullName && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                  <dd>{person.fullName}</dd>
                </div>
              )}
              <AuthGuard
                fallback={
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Contact Information</dt>
                    <dd className="text-sm text-muted-foreground">Sign in to view</dd>
                  </div>
                }
              >
                <div className="flex gap-3">
                  <div className="text-foreground flex items-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Email</dt>
                    <dd>{person.email}</dd>
                  </div>
                </div>
                {person.phoneNumber && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                    <dd>{person.phoneNumber}</dd>
                  </div>
                )}
              </AuthGuard>
            </dl>
          </CardContent>
        </Card>

        {person.bio && (
          <Card>
            <CardHeader>
              <CardTitle>Biography</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <StatsCard
                title="First Seen"
                value={stats?.firstSeen ? format(new Date(stats.firstSeen), "MMM d, yyyy") : "Unknown"}
                icon={<CalendarDays className="h-4 w-4 text-foreground" />}
              />
              <StatsCard
                title="Events Attended"
                value={stats?.attendanceCount || 0}
                icon={<Users className="h-4 w-4 text-foreground" />}
              />
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !events?.length ? (
              <p className="text-sm text-muted-foreground">No events attended yet.</p>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <div key={event.api_id} className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.startTime), 'MMM d, yyyy, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}