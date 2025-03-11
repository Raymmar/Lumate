import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { Star, CalendarDays, Users } from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetails } from './MemberDetails';
import { ProfileBadge } from "@/components/ui/profile-badge";
import type { User, Badge as BadgeType } from "@shared/schema";

interface PersonProfileProps {
  username: string;
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

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string;
  avatarUrl: string | null;
  role: string | null;
  isAdmin?: boolean;
  subscriptionStatus?: string;
  user?: User & { badges?: BadgeType[] };
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

export default function PersonProfile({ username }: PersonProfileProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // First fetch the person details
  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people/by-username', username],
    queryFn: async () => {
      console.log('Fetching person details for username:', username);
      const personResponse = await fetch(`/api/people/by-username/${encodeURIComponent(username)}`);

      if (!personResponse.ok) {
        const errorText = await personResponse.text();
        console.error('Person fetch failed:', {
          status: personResponse.status,
          statusText: personResponse.statusText,
          errorText,
          username
        });
        throw new Error(`Failed to fetch person details: ${personResponse.statusText}`);
      }

      const personData = await personResponse.json();
      console.log('Person data received:', personData);
      return personData;
    }
  });

  // Then fetch badges if we have a user ID
  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['/api/users', person?.user?.id, 'badges'],
    queryFn: async () => {
      if (!person?.user?.id) {
        console.log('No user ID available for badge fetch');
        return [];
      }

      console.log('Attempting to fetch badges for user:', {
        userId: person.user.id,
        userName: person.userName
      });

      try {
        const badgesResponse = await fetch(`/api/users/${person.user.id}/badges`);
        if (!badgesResponse.ok) {
          console.error('Badge fetch failed:', {
            userId: person.user.id,
            status: badgesResponse.status,
            statusText: badgesResponse.statusText
          });
          return [];
        }

        const badgesData = await badgesResponse.json();
        console.log('Badges successfully fetched:', {
          userId: person.user.id,
          badges: badgesData,
          badgeCount: badgesData.length
        });
        return badgesData;
      } catch (error) {
        console.error('Error fetching badges:', error);
        return [];
      }
    },
    enabled: !!person?.user?.id
  });

  // Fetch person's stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/people', person?.api_id, 'stats'],
    queryFn: async () => {
      if (!person?.api_id) return null;
      const response = await fetch(`/api/people/${person.api_id}/stats`);
      if (!response.ok) throw new Error('Failed to fetch person stats');
      return response.json();
    },
    enabled: !!person?.api_id
  });

  // Fetch person's events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/people', person?.api_id, 'events'],
    queryFn: async () => {
      if (!person?.api_id) return [];
      const response = await fetch(`/api/people/${person.api_id}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: !!person?.api_id
  });

  const isAdmin = Boolean(currentUser?.isAdmin);
  const isProfileAdmin = Boolean(person?.isAdmin);
  const hasActiveSubscription = Boolean(currentUser?.subscriptionStatus === 'active');
  const isLoading = personLoading || statsLoading || eventsLoading || badgesLoading;

  if (personError) {
    console.error('Error in PersonProfile:', personError);
    return (
      <div className="rounded-lg border bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load profile details. Please try again later.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Error: {personError instanceof Error ? personError.message : 'Unknown error'}
        </p>
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

  // Debug logging for the full state
  console.log('PersonProfile - Full state:', {
    person,
    badges,
    badgeCount: badges?.length,
    isLoading,
    userId: person?.user?.id
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
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
              <h1 className="text-2xl font-bold mb-2">
                {person.userName || "Anonymous"}
              </h1>
              <div className="flex items-center gap-2">
                {isProfileAdmin && <AdminBadge />}
                {person.role && (
                  <Badge variant="secondary">
                    {person.role}
                  </Badge>
                )}
                {/* Show badges if they exist */}
                {badges && badges.length > 0 && badges.map((badge) => {
                  console.log('Rendering badge:', badge);
                  return (
                    <ProfileBadge
                      key={badge.id}
                      name={badge.name}
                      icon={<Star className="h-3 w-3" />}
                      variant="default"
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="py-4 pt-4">
            {person.user?.bio ? (
              <p className="text-sm text-muted-foreground">{person.user.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No bio available</p>
            )}
          </CardContent>
        </Card>

        {/* Show member details whenever we have user data */}
        {person.user && <MemberDetails user={person.user} />}
      </div>

      <div>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-4">
              <StatsCard
                title="First Seen"
                value={stats?.firstSeen ? format(new Date(stats.firstSeen), "MMM d, yyyy") : "Unknown"}
                icon={<CalendarDays className="h-4 w-4 text-foreground" />}
              />
              <StatsCard
                title="Events Attended"
                value={events?.length || 0}
                icon={<Users className="h-4 w-4 text-foreground" />}
              />
            </div>

            {events && events.length > 0 && (
              <div className="space-y-1 mt-4 border-t pt-4">
                <div className="max-h-[40vh] overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
                  {events.map((event) => (
                    <div key={event.api_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.startTime), 'MMM d, yyyy, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}