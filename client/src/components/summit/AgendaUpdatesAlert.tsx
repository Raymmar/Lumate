import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function AgendaUpdatesAlert() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const { data: featuredEvent } = useQuery({
    queryKey: ["/api/events/featured"],
    queryFn: async () => {
      const response = await fetch("/api/events/featured");
      if (!response.ok) {
        throw new Error("Failed to fetch featured event");
      }
      return response.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const checkResponse = await fetch(
        `/api/people/check-email?email=${encodeURIComponent(email)}`,
      );
      const checkData = await checkResponse.json();

      if (checkData.exists && checkData.personId) {
        const claimResponse = await fetch("/api/auth/claim-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, personId: checkData.personId }),
        });

        if (claimResponse.ok) {
          toast({
            title: "Profile Found!",
            description: "Check your email for instructions to claim your profile.",
          });
        }
      } else {
        const response = await fetch("/api/events/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, event_api_id: featuredEvent?.api_id }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to send invite");
        }

        toast({
          title: "You're signed up!",
          description: "Check your email for updates about the Summit.",
        });
      }

      setIsSubmitted(true);
    } catch (error) {
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
    <div className="mb-8 flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4" data-testid="alert-agenda-updates">
      <Bell className="h-8 w-8 text-primary flex-shrink-0" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
        <div className="flex-1">
          <p className="font-medium text-foreground">Drop your email for community updates!</p>
          <p className="text-sm text-muted-foreground">You'll get an invite to our next event and updates about our growing community.</p>
        </div>
        {isSubmitted ? (
          <p className="text-sm text-primary font-medium whitespace-nowrap">Thanks for signing up!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
            <Input
              placeholder="Enter your email"
              type="email"
              className="w-48 md:w-56"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              data-testid="input-agenda-email"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              data-testid="button-agenda-subscribe"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
