import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Person } from '@/components/people/PeopleDirectory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from 'react';
import { AuthGuard } from "@/components/AuthGuard";
import { AdminBadge } from "@/components/AdminBadge";
import { ADMIN_EMAILS } from "@/components/AdminGuard";
import { CalendarDays, Users, DollarSign, ChevronDown } from 'lucide-react';
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

function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/5 rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-semibold">{value}</p>
          {description && (
            <span className="text-xs text-muted-foreground">({description})</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EventsList() {
  const events = [
    { name: "April Tech JAM", date: "2025-04-17T17:00:00" },
    { name: "March Tech JAM", date: "2025-03-20T17:00:00" },
    { name: "February Tech JAM", date: "2025-02-20T17:00:00" },
    { name: "October Tech JAM", date: "2024-10-24T17:00:00" },
    { name: "September Tech JAM", date: "2024-09-19T17:00:00" },
    { name: "We're back! August Tech JAM!", date: "2024-08-15T17:00:00" },
    { name: "Summer JAM 2024", date: "2024-06-20T19:00:00" },
    { name: "May Tech JAM", date: "2024-05-16T17:00:00" },
    { name: "April Tech JAM @ S-One", date: "2024-04-18T17:00:00" },
    { name: "March Tech JAM", date: "2024-03-21T17:00:00" },
    { name: "Tech JAM 2024", date: "2024-02-15T17:00:00" },
    { name: "Sarasota Tech - January Social", date: "2024-01-18T17:00:00" },
    { name: "#4 - Sarasota Tech - Holiday Happy Hour", date: "2023-12-06T17:00:00" }
  ];

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <CardTitle className="text-base">Events</CardTitle>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          All Events <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {events.map((event) => (
            <div key={event.name} className="flex items-center justify-between py-2 border-t">
              <div>
                <p className="text-sm font-medium">{event.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.date), 'MMM d, yyyy, h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonProfile({ personId }: PersonProfileProps) {
  const [email, setEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: person, isLoading, error } = useQuery<Person>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      return response.json();
    }
  });

  const { data: userStatus } = useQuery({
    queryKey: ['/api/auth/check-profile', personId],
    queryFn: async () => {
      const response = await fetch(`/api/auth/check-profile/${personId}`);
      if (!response.ok) throw new Error('Failed to check profile status');
      return response.json();
    }
  });

  const claimProfileMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log('Submitting claim profile request:', { email, personId });
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, personId }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Profile claim failed:', data);
        throw new Error(data.error || 'Failed to claim profile');
      }
      return data;
    },
    onSuccess: (data) => {
      console.log('Profile claim successful:', data);
      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your profile claim.",
      });
      setDialogOpen(false);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check-profile', personId] });
    },
    onError: (error: Error) => {
      console.error('Profile claim failed:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClaimProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Handling claim profile submission:', { email, personId });
    claimProfileMutation.mutate(email);
  };

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

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const isOwnProfile = user?.api_id === person?.api_id;
  const isClaimed = userStatus?.isClaimed || user !== null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main content area */}
      <div className="md:col-span-2 space-y-6">
        {/* Profile header */}
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
                {isAdmin && <AdminBadge />}
              </h1>
              <div className="flex items-center gap-2">
                <AuthGuard>
                  <p className="text-muted-foreground">{person.email}</p>
                </AuthGuard>
                {isOwnProfile && (
                  <Badge variant="outline" className="bg-white text-xs font-normal">
                    your profile
                  </Badge>
                )}
              </div>
              {/* Add Tag Button */}
              <div className="mt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  + Add Tag
                </Button>
              </div>
            </div>
          </div>

          {!user && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={isClaimed ? "outline" : "default"}
                  className={isClaimed ? "cursor-default" : ""}
                  disabled={isClaimed}
                >
                  {isClaimed ? "Profile Claimed" : "Claim Profile"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Claim Your Profile</DialogTitle>
                  <DialogDescription>
                    Enter your email address to verify and claim this profile. We'll send you a verification link.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleClaimProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={claimProfileMutation.isPending}
                    className="w-full"
                  >
                    {claimProfileMutation.isPending ? "Sending..." : "Send Verification Email"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Personal Information card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
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
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd>{person.email}</dd>
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

        {/* Biography card */}
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

      {/* Sidebar */}
      <div>
        {/* Stats Section */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <StatsCard
              title="First Seen"
              value={format(new Date("2023-10-11"), "MMM d, yyyy")}
              icon={<CalendarDays className="h-4 w-4 text-primary" />}
            />
            <StatsCard
              title="Events Attended"
              value="16"
              description="6 checked in"
              icon={<Users className="h-4 w-4 text-primary" />}
            />
            <StatsCard
              title="Revenue"
              value="$0.00"
              icon={<DollarSign className="h-4 w-4 text-primary" />}
            />
          </CardContent>
        </Card>

        {/* Events List */}
        <EventsList />
      </div>
    </div>
  );
}