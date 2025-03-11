import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionSuccessPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  type SessionResponse = {
    status: 'complete' | 'pending';
    subscription?: {
      id: string;
      status: string;
    };
    debug?: {
      sessionStatus: string;
      paymentStatus: string;
    };
  };

  const { data: sessionStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify payment status');
      }

      return response.json() as Promise<SessionResponse>;
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: (data) => {
      return !data || data.status !== 'complete' ? 2000 : false;
    },
    onSuccess: (data) => {
      if (data.status === 'complete') {
        // Invalidate multiple queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

        // Show success toast
        toast({
          title: "Subscription Activated",
          description: "Your subscription has been successfully activated.",
        });

        // Redirect after a short delay
        setTimeout(() => navigate('/settings'), 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify subscription status",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Verifying your subscription...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we confirm your payment
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Verification Error</h1>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Failed to verify payment status'}
            </p>
            <Button onClick={() => navigate('/settings')} className="mt-4">
              Return to Settings
            </Button>
          </div>
        ) : sessionStatus?.status === 'complete' ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Subscription Activated!</h1>
            <p className="text-muted-foreground mt-2">
              Thank you for subscribing. You now have access to all premium features.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting to settings...
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-yellow-500" />
            <h1 className="text-2xl font-bold mt-4">Processing Payment</h1>
            <p className="text-muted-foreground mt-2">
              We're confirming your subscription...
            </p>
            {sessionStatus?.debug && (
              <p className="text-xs text-muted-foreground mt-4">
                Status: {sessionStatus.debug.paymentStatus}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}