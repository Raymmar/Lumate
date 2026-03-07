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
  message: string;
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
      toast({
        title: "Verification Email Sent",
        description: "Please check your email to verify your account. Your Luma profile will be linked automatically if found.",
      });
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
          <DialogDescription className="space-y-4">
            <p className="text-xl">
              Enter your email below to create your account.
            </p>
            <ul className="list-decimal pl-5 space-y-2 text-sm">
              <li>We'll send you a verification email to confirm your address.</li>
              <li>If you've attended our events, your Luma profile will be linked automatically.</li>
              <li>From there you can set a password, log in & upgrade to add company details.</li>
            </ul>
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
            {claimProfileMutation.isPending ? "Sending..." : "Claim your profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}