import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from 'date-fns-tz';
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ExternalLink } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  coverUrl: string | null;
  url: string | null;
  timezone: string | null;
  api_id: string;
}

interface EventsResponse {
  events: Event[];
  total: number;
}

function formatEventDate(utcDateStr: string, timezone: string | null): string {
  try {
    const targetTimezone = timezone || 'America/New_York';
    return formatInTimeZone(
      new Date(utcDateStr),
      targetTimezone,
      'MMM d, h:mm a'
    );
  } catch (error) {
    console.error("Invalid date format:", utcDateStr, error);
    return "Date not available";
  }
}

function EventCard({ event }: { event: Event }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to check if user is going to the event
  const { data: rsvpStatus } = useQuery({
    queryKey: ['/api/events/check-rsvp', event.api_id],
    queryFn: async () => {
      const response = await fetch(`/api/events/check-rsvp?event_api_id=${event.api_id}`);
      if (!response.ok) {
        throw new Error('Failed to check RSVP status');
      }
      return response.json();
    },
    enabled: !!user // Only run query if user is logged in
  });

  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_api_id: event.api_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to RSVP');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've successfully RSVP'd to this event.",
      });
      // Invalidate the RSVP status query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/events/check-rsvp', event.api_id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRSVP = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the parent link from being clicked
    e.stopPropagation();
    if (!rsvpStatus?.isGoing) {
      rsvpMutation.mutate();
    }
  };

  return (
    <a 
      href={event.url || "#"} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div className="rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group">
        {/* Event thumbnail with relative positioning */}
        <div className="w-full relative">
          <AspectRatio ratio={16 / 9}>
            {event.coverUrl ? (
              <img
                src={event.coverUrl}
                alt={event.title}
                className="rounded-t-lg object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </AspectRatio>

          {/* RSVP Button - Only visible for logged in users */}
          <AuthGuard>
            <div className="absolute bottom-2 left-2">
              <Button 
                size="sm" 
                className="text-xs"
                variant={rsvpStatus?.isGoing ? "outline" : "default"}
                onClick={handleRSVP}
                disabled={rsvpMutation.isPending || rsvpStatus?.isGoing}
              >
                {rsvpMutation.isPending ? "..." : (rsvpStatus?.isGoing ? "Going" : "RSVP")}
              </Button>
            </div>
          </AuthGuard>
        </div>

        {/* Event details */}
        <div className="p-4">
          <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-xs">{formatEventDate(event.startTime, event.timezone)}</span>
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function EventList() {
  const { data, isLoading, error } = useQuery<EventsResponse>({
    queryKey: ["/api/events"]
  });

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-2.5">
        <p className="text-xs text-destructive">Failed to load events</p>
      </div>
    );
  }

  const now = new Date();
  const eventsArray = data?.events || [];

  // Sort events by start time and get the next upcoming event
  const upcomingEvent = eventsArray
    .filter(event => new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Next Event</h2>
        <a
          href="https://lu.ma/SarasotaTech"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span>View Full Calendar</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[88px]" />
        </div>
      ) : upcomingEvent ? (
        <EventCard event={upcomingEvent} />
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming events</p>
      )}
    </div>
  );
}