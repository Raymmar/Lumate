import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface JoinUsCardProps {
  showHeader?: boolean;
}

export function JoinUsCard({ showHeader = true }: JoinUsCardProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
        title: "Success!",
        description: "Please check your email for the invitation.",
      });

      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invite",
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
              <p className="text-muted-foreground mt-1">
                Connecting Sarasota's tech community and driving the city forward.
              </p>
            </>
          )}
        </CardHeader>
      )}
      <CardContent className="pt-6">
        {isSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thanks for joining! We've sent an invite to your email for our next event.
              Once you receive it, you can claim your profile to track your attendance and
              stay connected with the community.
            </p>
            <p className="text-sm text-muted-foreground">
              Be sure to check your inbox (or spam folder) for the invitation email.
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
                    Sending...
                  </>
                ) : (
                  "Join"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isEventLoading ? (
                "Loading event details..."
              ) : !featuredEvent ? (
                "No upcoming events available at the moment."
              ) : (
                "Drop your email for an invite to our next event and start networking with the region's top tech professionals."
              )}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}