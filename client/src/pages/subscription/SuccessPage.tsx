import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SessionResponse {
  status: 'complete' | 'pending';
  session: {
    paymentStatus: string;
    subscriptionStatus?: string;
  };
}

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  const { data, isLoading, error } = useQuery<SessionResponse>({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID provided');
      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify payment');
      }
      return response.json();
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: (data) => data?.status === 'complete' ? false : 2000
  });

  useEffect(() => {
    if (data?.status === 'complete') {
      // Give webhook a moment to process before redirecting
      const timer = setTimeout(() => setLocation('/settings'), 2000);
      return () => clearTimeout(timer);
    }
  }, [data, setLocation]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Missing Session ID</h1>
            <p className="text-muted-foreground mt-2">
              No payment session found. Please try the subscription process again.
            </p>
            <Button onClick={() => setLocation('/settings')} className="mt-4">
              Return to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold mt-4">Verifying Payment</h1>
            <p className="text-muted-foreground mt-2">
              Please wait while we confirm your subscription...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Verification Error</h1>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Failed to verify payment status'}
            </p>
            <Button onClick={() => setLocation('/settings')} className="mt-4">
              Return to Settings
            </Button>
          </div>
        ) : data?.status === 'complete' ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Your subscription has been activated. Redirecting to settings...
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold mt-4">Processing Payment</h1>
            <p className="text-muted-foreground mt-2">
              Payment Status: {data?.session.paymentStatus}<br />
              {data?.session.subscriptionStatus && (
                <>Subscription Status: {data.session.subscriptionStatus}</>
              )}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}