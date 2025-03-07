import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  // Query subscription status
  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ['/api/stripe/subscription/status'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/subscription/status');
      if (!response.ok) throw new Error('Failed to fetch subscription status');
      return response.json();
    },
    // Only start querying once we have a session ID
    enabled: !!sessionId,
  });

  useEffect(() => {
    // If subscription is active, wait a moment then redirect to settings
    if (subscriptionStatus?.status === 'active') {
      const timer = setTimeout(() => {
        setLocation('/settings');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [subscriptionStatus, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Confirming your subscription...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Just a moment while we verify your payment
            </p>
          </div>
        ) : subscriptionStatus?.status === 'active' ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Subscription Activated!</h1>
            <p className="text-muted-foreground mt-2">
              Your premium account is now active. You'll be redirected to your settings page shortly.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Thank you for subscribing to our premium features.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Verification in Progress</h1>
            <p className="text-muted-foreground mt-2">
              We're still processing your subscription. Please check back in a few moments.
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
