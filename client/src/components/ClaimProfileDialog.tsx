import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClaimProfileDialogProps {
  trigger?: React.ReactNode;
  personId?: string;
  onOpenChange?: (open: boolean) => void;
}

interface ClaimProfileResponse {
  status?: 'invited';
  message: string;
  nextEvent?: {
    title: string;
    startTime: string;
    url: string | null;
  };
}

export function ClaimProfileDialog({ trigger, personId, onOpenChange }: ClaimProfileDialogProps) {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const claimProfileMutation = useMutation({
    mutationFn: async (data: { email: string; personId?: string }) => {
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok && !responseData.status) {
        throw new Error(responseData.error || 'Failed to claim profile');
      }
      return responseData as ClaimProfileResponse;
    },
    onSuccess: (data) => {
      // Handle successful profile claim
      if (data.status === 'invited') {
        toast({
          title: "Invitation Sent",
          description: (
            <>
              {data.message}
              {data.nextEvent?.url && (
                <div className="mt-2">
                  <a 
                    href={data.nextEvent.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Click here to view the event details
                  </a>
                </div>
              )}
            </>
          ),
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email to verify your profile claim.",
        });
      }
      setEmail('');
      setOpen(false);
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Claim Profile</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Your Profile</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>
              If you've attended one of our events in the past, enter your email to claim your member profile.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>
                Enter your{' '}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-dotted cursor-help">lu.ma</span>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      align="start"
                      sideOffset={5}
                    >
                      <p className="max-w-xs">Make sure this is the same email you use to register for our events</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {' '}email to claim your account
              </li>
              <li>If we find a match, we'll send a confirmation email</li>
              <li>Click that email to activate your account</li>
              <li>Create a password</li>
              <li>Log in</li>
            </ol>
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