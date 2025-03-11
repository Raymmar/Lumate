import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SubscriptionCheckout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        console.log('Starting checkout process...');
        const response = await apiRequest('POST', '/api/stripe/create-checkout-session');

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to initialize checkout');
        }

        const data = await response.json();
        if (data.url) {
          console.log('Redirecting to Stripe checkout:', data.url);
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to initialize checkout session. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeCheckout();
  }, [toast, setLocation]);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Subscription</CardTitle>
          <CardDescription>
            Redirecting to secure checkout...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    </div>
  );
}