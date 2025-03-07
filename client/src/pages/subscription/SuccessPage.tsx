import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  // Query the checkout session status
  const { data: sessionStatus, isLoading, error } = useQuery({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      console.log('Verifying session:', sessionId);
      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Failed to verify payment status');
      const data = await response.json();
      console.log('Session status response:', data);
      return data;
    },
    enabled: !!sessionId,
    retry: 3,
    refetchInterval: 2000, // Poll every 2 seconds until we get a complete status
  });

  useEffect(() => {
    // If payment is confirmed, redirect to settings after a short delay
    if (sessionStatus?.status === 'complete') {
      const timer = setTimeout(() => {
        setLocation('/settings');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Verifying your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Just a moment while we confirm your subscription
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Verification Failed</h1>
            <p className="text-muted-foreground mt-2">
              We couldn't verify your payment status. Please contact support if this persists.
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
              Your premium subscription has been activated. You'll be redirected shortly.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Payment Processing</h1>
            <p className="text-muted-foreground mt-2">
              Session ID: {sessionId}<br />
              Status: {sessionStatus?.status || 'pending'}<br />
              {sessionStatus?.subscriptionStatus && `Subscription: ${sessionStatus.subscriptionStatus}`}
            </p>
            <Button onClick={() => setLocation('/settings')} className="mt-4">
              Return to Settings
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}