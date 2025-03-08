import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminBadge } from "@/components/AdminBadge";
import { Star, Code, Heart, CalendarDays, Users } from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetails } from './MemberDetails';
import { ProfileBadge } from "@/components/ui/profile-badge";

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
  user?: {
    id: number;
    email: string;
    displayName: string;
    bio: string;
    isAdmin: boolean;
    [key: string]: any;
  };
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

  // Fetch person details
  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people/by-username', username],
    queryFn: async () => {
      const response = await fetch(`/api/people/by-username/${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      return response.json();
    }
  });

  // Fetch person's subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/people', person?.api_id, 'subscription'],
    queryFn: async () => {
      if (!person?.api_id) return null;
      const response = await fetch(`/api/people/${person.api_id}/subscription`);
      if (!response.ok) throw new Error('Failed to fetch subscription status');
      return response.json();
    },
    enabled: !!person?.api_id
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
  const isProfilePaidUser = Boolean(person?.user?.subscriptionStatus === 'active');
  const hasActiveSubscription = Boolean(currentUser?.subscriptionStatus === 'active');
  const isLoading = personLoading || statsLoading || subscriptionLoading || eventsLoading;

  console.log('Profile visibility:', {
    isProfileAdmin,
    isProfilePaidUser,
    hasActiveSubscription,
    isAdmin,
    shouldShowMemberDetails: person?.user && (isProfileAdmin || isProfilePaidUser || hasActiveSubscription || isAdmin),
    personSubscriptionStatus: person?.user?.subscriptionStatus,
    subscriptionStatus
  });

  if (personError) {
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

  const userBadges = [
    { name: "Top Contributor", icon: <Star className="h-3 w-3" /> },
    { name: "Code Mentor", icon: <Code className="h-3 w-3" /> },
    { name: "Community Leader", icon: <Heart className="h-3 w-3" /> }
  ];

  // Show member details if:
  // 1. The profile exists (person.user)
  // 2. AND any of:
  //    - The profile being viewed belongs to an admin
  //    - The profile being viewed belongs to a paid user
  //    - The current viewer has an active subscription
  //    - The current viewer is an admin
  const shouldShowMemberDetails = person.user && (
    isProfileAdmin || 
    isProfilePaidUser || 
    hasActiveSubscription || 
    isAdmin
  );


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
                {userBadges.map((badge, index) => (
                  <ProfileBadge
                    key={index}
                    name={badge.name}
                    icon={badge.icon}
                  />
                ))}
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

        {shouldShowMemberDetails && (
          <AuthGuard>
            <MemberDetails user={person.user} />
          </AuthGuard>
        )}
      </div>

      <div>
        <Card className="p-4">
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