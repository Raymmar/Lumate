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

interface PersonProfileProps {
  personId: string;
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

  const isClaimed = userStatus?.isClaimed || user !== null;
  const isOwnProfile = user?.api_id === person.api_id;

  return (
    <div className="space-y-6">
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
            <h1 className="text-2xl font-bold">
              {person.userName || "Anonymous"}
              {person.role && (
                <Badge variant="secondary" className="ml-2">
                  {person.role}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">{person.email}</p>
            {isOwnProfile && (
              <p className="text-sm text-muted-foreground mt-1">This is your profile</p>
            )}
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

      <div className="grid gap-4 md:grid-cols-2">
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
              <div>
                <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                <dd className="font-mono text-sm">{person.api_id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Organization</dt>
                <dd>{person.organizationName || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Job Title</dt>
                <dd>{person.jobTitle || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                <dd>{person.role || "Not specified"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {person.bio && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Biography</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}