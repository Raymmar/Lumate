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

      // First test if the endpoint is reachable
      const pingResponse = await fetch('/api/stripe/ping');
      if (!pingResponse.ok) {
        throw new Error('Could not reach Stripe verification endpoint');
      }

      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to verify payment status');
      }

      const data = await response.json();
      console.log('📦 Session verification response:', data);
      return data;
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (sessionStatus?.status === 'complete') {
      console.log('✅ Payment confirmed, redirecting...');
      const timer = setTimeout(() => {
        setLocation('/settings');
      }, 3000);
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
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Verifying payment...</p>
            <p className="text-sm text-muted-foreground mt-2">Session ID: {sessionId}</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Verification Error</h1>
            <p className="text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Failed to verify payment status'}
            </p>
            <div className="mt-4 text-sm text-muted-foreground">
              Debug Info:<br />
              Session ID: {sessionId}
            </div>
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
            <Loader2 className="h-12 w-12 text-yellow-500 mx-auto animate-spin" />
            <h1 className="text-2xl font-bold mt-4">Verifying Payment</h1>
            <p className="text-muted-foreground mt-2">
              Status: {sessionStatus?.status || 'checking'}<br />
              {sessionStatus?.debug && (
                <span className="text-sm">
                  Payment: {sessionStatus.debug.paymentStatus}<br />
                  Session: {sessionStatus.debug.sessionStatus}
                </span>
              )}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}