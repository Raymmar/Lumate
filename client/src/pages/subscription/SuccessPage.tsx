import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [location, setLocation] = useLocation();
  const sessionId = new URLSearchParams(location.split('?')[1]).get('session_id');

  const { data: sessionStatus, isLoading } = useQuery({
    queryKey: ['/api/stripe/session-status', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Failed to verify payment status');
      return response.json();
    },
    enabled: !!sessionId,
    retry: 3,
  });

  useEffect(() => {
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
        {isLoading || !sessionStatus?.status ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Confirming your payment...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold mt-4">Payment Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Your premium subscription has been activated. Redirecting to settings...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}