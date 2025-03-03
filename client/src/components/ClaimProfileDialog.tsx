import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ClaimProfileDialogProps {
  trigger?: React.ReactNode;
  personId?: string;
  onOpenChange?: (open: boolean) => void;
}

export function ClaimProfileDialog({ trigger, personId, onOpenChange }: ClaimProfileDialogProps) {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const claimProfileMutation = useMutation({
    mutationFn: async (data: { email: string; personId?: string }) => {
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to claim profile');
      }
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your profile claim.",
      });
      setEmail('');
      if (personId) {
        queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/check-profile', personId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    claimProfileMutation.mutate({ email, personId });
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Claim Profile</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Your Profile</DialogTitle>
          <DialogDescription>
            Enter your email address to verify and claim your profile. We'll send you a verification link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
  );
}
