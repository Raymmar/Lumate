import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SessionStatusResponse {
  status: 'complete' | 'pending';
  debug?: {
    sessionStatus: string;
    paymentStatus: string;
    subscriptionStatus?: string;
  };
}

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  const { data: sessionStatus, isLoading, error } = useQuery<SessionStatusResponse, Error>({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      console.log('🔍 Verifying session:', sessionId);

      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
        console.log('📦 Session verification response:', {
          status: response.status,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Session verification failed:', errorData);
          throw new Error(errorData.message || 'Failed to verify payment status');
        }

        const data = await response.json();
        console.log('✅ Session verification data:', data);
        return data;
      } catch (error) {
        console.error('❌ Session verification error:', error);
        throw error;
      }
    },
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: (data) => {
      if (!data) return 2000;
      return data.status === 'complete' ? false : 2000;
    }
  });

  useEffect(() => {
    if (sessionStatus?.status === 'complete') {
      console.log('✨ Payment confirmed, redirecting to settings...');
      const timer = setTimeout(() => setLocation('/settings'), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Verifying payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Session: {sessionId}
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
            <Loader2 className="h-12 w-12 text-yellow-500 mx-auto animate-spin" />
            <h1 className="text-2xl font-bold mt-4">Processing Payment</h1>
            <p className="text-muted-foreground mt-2">
              Status: {sessionStatus?.status || 'checking'}<br />
              {sessionStatus?.debug && (
                <span className="text-sm">
                  Payment Status: {sessionStatus.debug.paymentStatus}<br />
                  Session Status: {sessionStatus.debug.sessionStatus}<br />
                  {sessionStatus.debug.subscriptionStatus && (
                    <>Subscription Status: {sessionStatus.debug.subscriptionStatus}</>
                  )}
                </span>
              )}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}