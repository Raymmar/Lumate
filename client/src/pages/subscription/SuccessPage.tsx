import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  type SessionResponse = {
    status: 'complete' | 'pending';
    needsAccountSetup?: boolean;
    accountEmail?: string | null;
    debug?: {
      sessionStatus: string;
      paymentStatus: string;
    };
  };

  const { data: sessionStatus, isLoading, error } = useQuery<SessionResponse>({
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
    if (sessionStatus?.status === 'complete' && !sessionStatus?.needsAccountSetup && user) {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      const timer = setTimeout(() => navigate('/settings'), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, navigate, queryClient, user]);

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
            <Button onClick={() => navigate('/memberships')} className="mt-4">
              Return to Memberships
            </Button>
          </div>
        ) : sessionStatus?.status === 'complete' && sessionStatus?.needsAccountSetup ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Your Premium membership is active.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <Mail className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="font-medium">Check your email to complete setup</p>
              <p className="text-sm text-muted-foreground mt-1">
                We've sent a verification email to <strong>{sessionStatus.accountEmail}</strong>. 
                Click the link to set your password and access your account.
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              If you've attended our events, your Luma profile will be linked automatically.
            </p>
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