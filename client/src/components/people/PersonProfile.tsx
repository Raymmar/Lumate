import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
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
import { Star, Code, Heart, CalendarDays, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetails } from './MemberDetails';
import { ProfileBadge } from "@/components/ui/profile-badge";

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
  const isProfileAdmin = person.user?.isAdmin || false;

  // Mock data for badges - This should eventually come from the API
  const userBadges = [
    { name: "Top Contributor", icon: <Star className="h-3 w-3" /> },
    { name: "Code Mentor", icon: <Code className="h-3 w-3" /> },
    { name: "Community Leader", icon: <Heart className="h-3 w-3" /> }
  ];

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
            </div>
          </div>

          {user ? (
            isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() => window.location.href = "/settings"}
              >
                Edit Profile
              </Button>
            ) : null
          ) : (
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

        {/* Badges Section */}
        <div className="flex flex-wrap gap-2">
          {userBadges.map((badge, index) => (
            <ProfileBadge
              key={index}
              name={badge.name}
              icon={badge.icon}
            />
          ))}
        </div>

        {/* Profile Information */}
        <Card>
          <CardContent className="py-4 pt-4 space-y-4">
            {/* Bio */}
            {person.user?.bio && (
              <div className="space-y-2">
                <h3 className="font-medium">About</h3>
                <p className="text-sm text-muted-foreground">{person.user.bio}</p>
              </div>
            )}

            {/* Company Information */}
            {(person.user?.companyName || person.user?.companyDescription) && (
              <div className="space-y-2">
                <h3 className="font-medium">Company</h3>
                {person.user.companyName && (
                  <p className="text-sm font-medium">{person.user.companyName}</p>
                )}
                {person.user.companyDescription && (
                  <p className="text-sm text-muted-foreground">{person.user.companyDescription}</p>
                )}
              </div>
            )}

            {/* Contact Information */}
            {(person.user?.phoneNumber || person.user?.address) && (
              <div className="space-y-2">
                <h3 className="font-medium">Contact</h3>
                {person.user.phoneNumber && (
                  <p className="text-sm text-muted-foreground">{person.user.phoneNumber}</p>
                )}
                {person.user.address && (
                  <p className="text-sm text-muted-foreground">{person.user.address}</p>
                )}
              </div>
            )}

            {/* Custom Links */}
            {person.user?.customLinks && person.user.customLinks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Links</h3>
                <div className="space-y-2">
                  {person.user.customLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      {/* You can import specific icons based on the icon name stored in the database */}
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tags */}
            {person.user?.profileTags && person.user.profileTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {person.user.profileTags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional details for authenticated users */}
        <AuthGuard>
          <MemberDetails />
        </AuthGuard>
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