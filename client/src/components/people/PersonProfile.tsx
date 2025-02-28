import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Person } from '@/components/people/PeopleDirectory';

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
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, personId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim profile');
      }
      return data;
    },
    onSuccess: (data) => {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClaimProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
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
          <Avatar className="h-16 w-16">
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
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">{person.email}</p>
              {isOwnProfile && (
                <Badge variant="outline" className="bg-white text-xs font-normal">
                  your profile
                </Badge>
              )}
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
    </div>
  );
}