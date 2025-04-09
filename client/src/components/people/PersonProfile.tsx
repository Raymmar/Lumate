import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { CalendarDays, Users } from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetails } from './MemberDetails';
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getBadgeIcon } from '@/lib/badge-icons';
import { CompanyPreview } from '@/components/companies/CompanyPreview';
import { User } from '@shared/schema';
import { Link } from 'wouter';

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

interface Badge {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  isAutomatic: boolean;
}

interface UserCompany {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  industry: string | null;
  bio: string | null;
  tags: string[] | null;
  role: string; // member role in company: 'admin' or 'user'
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
  user?: User;
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


const renderBadgeIcon = (badge: Badge) => {
  return getBadgeIcon(badge.icon);
};

// Helper function to generate slug from company name - matches the one in CompanyDirectory.tsx
const generateSlug = (name: string): string => {
  return name
    .replace(/\./g, '')
    .replace(/&/g, 'and')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function PersonProfile({ username }: PersonProfileProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  console.log('PersonProfile - Attempting to fetch profile for username:', username);

  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people/by-username', username],
    queryFn: async () => {
      console.log('Fetching person details for username:', username);
      const response = await fetch(`/api/people/by-username/${encodeURIComponent(username)}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch person details:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          username
        });
        throw new Error(`Failed to fetch person details: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched person details:', {
        id: data.id,
        apiId: data.api_id,
        username: data.userName,
        hasBadges: data.user?.badges?.length > 0
      });
      return data;
    }
  });

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

  // Fetch user's company details
  const { data: userCompany, isLoading: companyLoading } = useQuery<UserCompany>({
    queryKey: ['/api/companies/user/company-profile', person?.user?.id],
    queryFn: async () => {
      if (!person?.user?.id) return null;
      const response = await fetch(`/api/companies/user/company-profile/${person.user.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          // No company profile found, just return null
          return null;
        }
        throw new Error('Failed to fetch company profile');
      }
      return response.json();
    },
    enabled: !!person?.user?.id
  });

  const isAdmin = Boolean(currentUser?.isAdmin);
  const isProfileAdmin = Boolean(person?.isAdmin);
  const hasActiveSubscription = Boolean(currentUser?.subscriptionStatus === 'active');
  const isLoading = personLoading || statsLoading || eventsLoading || companyLoading;

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
      <div className="space-y-4 w-full">
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
    <div className="grid gap-4 md:grid-cols-3 w-full max-w-full">
      <div className="md:col-span-2 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-20 w-20 flex-shrink-0">
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
            <div className="min-w-0">
              <h1 className="text-2xl font-bold mb-2 truncate">
                {person.userName || "Anonymous"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {isProfileAdmin && <AdminBadge />}
                {person.role && (
                  <Badge variant="secondary" className="truncate max-w-full">
                    {person.role}
                  </Badge>
                )}
                {person.user?.badges?.map((badge) => (
                  <ProfileBadge
                    key={badge.id}
                    name={badge.name}
                    icon={renderBadgeIcon(badge)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="py-4 pt-4">
            {person.user?.bio ? (
              <p className="text-lg text-muted-foreground break-words">{person.user.bio}</p>
            ) : (
              <p className="text-lg text-muted-foreground">No bio available</p>
            )}
          </CardContent>
        </Card>

        {/* Company information - shows for any visitor when the profile owner has a paid account or is an admin */}
        {userCompany && (Boolean(person.subscriptionStatus === 'active') || isProfileAdmin) && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium ml-1">Company</h3>
            <Card className="overflow-hidden rounded-xl">
              {userCompany.featuredImageUrl && (
                <div className="relative h-[200px] w-full overflow-hidden rounded-t-xl">
                  <img
                    src={userCompany.featuredImageUrl}
                    alt={userCompany.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  {userCompany.logoUrl && (
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      <img 
                        src={userCompany.logoUrl} 
                        alt={userCompany.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{userCompany.name}</h3>
                </div>
                
                {userCompany.industry && (
                  <p className="text-sm text-muted-foreground">{userCompany.industry}</p>
                )}
                
                {userCompany.bio && (
                  <p className="text-muted-foreground">{userCompany.bio}</p>
                )}
                
                {userCompany.tags && userCompany.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {userCompany.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  asChild
                  className="w-full mt-2"
                >
                  <Link href={`/companies/${generateSlug(userCompany.name)}`}>
                    View full company profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show legacy MemberDetails only if no company data is available or if the profile owner doesn't have paid account/admin status */}
        {(!userCompany || (!(person.subscriptionStatus === 'active') && !isProfileAdmin)) && person.user && <MemberDetails user={person.user as any} />}
      </div>

      <div className="w-full">
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
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
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