import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  const { data: sessionStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      console.log('🔍 Verifying session:', sessionId);
      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify payment status');
      }

      const data = await response.json();
      console.log('📦 Session verification response:', data);
      return data;
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: (data) => {
      console.log('Checking refetch status:', data?.status);
      return data?.status === 'complete' ? false : 2000;
    }
  });

  useEffect(() => {
    if (sessionStatus?.status === 'complete') {
      console.log('✨ Payment confirmed, redirecting to settings...');
      const timer = setTimeout(() => setLocation('/settings'), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, setLocation]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Invalid Session</h1>
            <p className="text-muted-foreground mt-2">
              No session ID found. Please try the subscription process again.
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
            <p className="mt-4 text-lg">Verifying payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we confirm your subscription
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
        ) : sessionStatus?.status === 'complete' ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Your premium subscription has been activated. Redirecting to settings...
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-yellow-500" />
            <h1 className="text-2xl font-bold mt-4">Confirming Payment</h1>
            <p className="text-muted-foreground mt-2">
              {sessionStatus?.debug?.paymentStatus || 'Processing payment...'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}