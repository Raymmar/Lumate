import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';

interface JoinUsCardProps {
  showHeader?: boolean;
}

export function JoinUsCard({ showHeader = true }: JoinUsCardProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    exists: boolean;
    personId?: string;
    isClaimed?: boolean;
  }>({ exists: false });
  const { toast } = useToast();

  // Fetch featured event
  const { data: featuredEvent, isLoading: isEventLoading } = useQuery({
    queryKey: ["/api/events/featured"],
    queryFn: async () => {
      const response = await fetch("/api/events/featured");
      if (!response.ok) {
        throw new Error("Failed to fetch featured event");
      }
      return response.json();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Processing submission for:', email);

      // Check for existing profile
      const checkResponse = await fetch(`/api/people/check-email?email=${encodeURIComponent(email)}`);
      const checkData = await checkResponse.json();
      setProfileStatus(checkData);

      if (checkData.exists && checkData.personId) {
        console.log('Found existing profile, initiating claim process');

        // Send claim profile request
        const claimResponse = await fetch('/api/auth/claim-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            personId: checkData.personId
          })
        });

        const claimData = await claimResponse.json();

        if (claimResponse.ok) {
          toast({
            title: "Profile Found!",
            description: "Check your email for instructions to claim your profile and log in.",
          });
        }
      } else {
        console.log('No existing profile, sending event invite');

        // Send event invite for new users
        const response = await fetch('/api/events/send-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            event_api_id: featuredEvent?.api_id
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Failed to send invite');
        }

        toast({
          title: "Welcome!",
          description: "Check your email for an invitation to our next event.",
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error processing submission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border">
      {showHeader && (
        <CardHeader className="pb-3">
          {isSubmitted ? (
            <CardTitle>Welcome to Sarasota Tech</CardTitle>
          ) : (
            <>
              <CardTitle>Sarasota.Tech</CardTitle>
              <p className="text-muted-foreground text-wrap-balanced text-xl mt-1">
                We're connecting Sarasota's tech community and driving the city forward.
              </p>
            </>
          )}
        </CardHeader>
      )}
      <CardContent className="pt-12">
        {isSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {profileStatus.exists ? (
                "We found your existing profile! Check your email for instructions to claim it and log in."
              ) : (
                "Thanks for joining! We've sent you an invite to our next event."
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Be sure to check your inbox (or spam folder) for our email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email"
                type="email"
                className="flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isEventLoading || !featuredEvent}
              />
              <Button
                className="bg-primary hover:bg-primary/90"
                type="submit"
                disabled={isLoading || isEventLoading || !featuredEvent}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Join us"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isEventLoading ? (
                "Loading event details..."
              ) : !featuredEvent ? (
                "No upcoming events available at the moment."
              ) : (
                "Enter your email for an invite to our next event."
              )}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}