import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  // Type the response data
  type SessionResponse = {
    status: 'complete' | 'pending';
    debug?: {
      sessionStatus: string;
      paymentStatus: string;
    };
  };

  const { data: sessionStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      console.log('🔍 Verifying session:', sessionId);

      if (!sessionId) {
        throw new Error('No session ID provided');
      }

      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify payment status');
      }

      return response.json();
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: (data) => {
      return !data || data.status !== 'complete' ? 2000 : false;
    }
  });

  useEffect(() => {
    if (sessionStatus?.status === 'complete') {
      console.log('✨ Payment confirmed, invalidating queries...');
      // Invalidate relevant queries to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      const timer = setTimeout(() => navigate('/settings'), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, navigate, queryClient]);

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
            <Loader2 className="h-12 w-12 text-yellow-500 mx-auto animate-spin" />
            <h1 className="text-2xl font-bold mt-4">Processing Payment</h1>
            <p className="text-muted-foreground mt-2">
              We're confirming your subscription...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}