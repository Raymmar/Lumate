import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from 'date-fns-tz';
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ExternalLink, Users, CalendarPlus } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PublicEventPreview } from "./PublicEventPreview";
import { useState } from "react";
import { Event } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatUsernameForUrl } from "@/lib/utils";

interface EventsResponse {
  events: Event[];
  total: number;
}

interface EventListProps {
  compact?: boolean;
}

function formatEventDate(utcDateStr: string, timezone: string | null): string {
  try {
    const eventTimezone = timezone || 'America/New_York';
    const utcDate = new Date(utcDateStr + 'Z');
    return formatInTimeZone(
      utcDate,
      eventTimezone,
      'MMM d, h:mm aa zzz'
    );
  } catch (error) {
    console.error("Invalid date format:", utcDateStr, error);
    return "Date not available";
  }
}

function generateCalendarUrl(event: Event) {
  const startDate = new Date(event.startTime + 'Z');
  const endDate = new Date(event.endTime + 'Z');

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description || '',
    ctz: event.timezone || 'America/New_York',
  });

  if (event.location?.full_address) {
    params.append('location', event.location.full_address);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function EventCard({ event, onSelect, compact }: { event: Event; onSelect: (event: Event) => void; compact?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rsvpStatus } = useQuery({
    queryKey: ['/api/events/check-rsvp', event.api_id],
    queryFn: async () => {
      const response = await fetch(`/api/events/check-rsvp?event_api_id=${event.api_id}`);
      if (!response.ok) {
        throw new Error('Failed to check RSVP status');
      }
      return response.json();
    },
    enabled: !!user
  });

  const { data: attendeesData, isLoading: isAttendeesLoading } = useQuery({
    queryKey: [`/api/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      const data = await response.json();
      if (data.attendees) {
        data.attendees = data.attendees.filter((person: any) =>
          person.userName && person.userName.toLowerCase() !== "anonymous"
        );
      }
      return data;
    },
    staleTime: 30000
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
      queryClient.invalidateQueries({ queryKey: ['/api/events/check-rsvp', event.api_id] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/attendees`] });
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
    e.preventDefault();
    e.stopPropagation();
    if (!rsvpStatus?.isGoing) {
      rsvpMutation.mutate();
    }
  };

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(generateCalendarUrl(event), '_blank');
  };

  if (compact) {
    return (
      <div
        onClick={() => onSelect(event)}
        className="cursor-pointer"
      >
        <div className="rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group">
          <div className="p-4 flex gap-4 items-center">
            <div className="w-16 h-16 flex-shrink-0 relative rounded-md overflow-hidden">
              {event.coverUrl ? (
                <img
                  src={event.coverUrl}
                  alt={event.title}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                {event.title}
              </h3>
              <div className="text-xs text-muted-foreground">
                {formatEventDate(event.startTime, event.timezone)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <AuthGuard>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={rsvpStatus?.isGoing ? "outline" : "default"}
                      onClick={handleRSVP}
                      disabled={rsvpMutation.isPending || rsvpStatus?.isGoing}
                      className="text-xs px-2 h-6"
                    >
                      {rsvpMutation.isPending ? "..." : (rsvpStatus?.isGoing ? "Going" : "RSVP")}
                    </Button>
                    {rsvpStatus?.isGoing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddToCalendar}
                        className="text-xs px-2 h-6"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </AuthGuard>
                {!isAttendeesLoading && (
                  <span className="text-xs text-muted-foreground">
                    {attendeesData?.total || 0} attending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(event)}
      className="cursor-pointer"
    >
      <div className="rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group">
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

          <div className="absolute bottom-2 left-2 flex gap-2">
            <AuthGuard>
              <Button
                size="sm"
                className="text-xs"
                variant={rsvpStatus?.isGoing ? "outline" : "default"}
                onClick={handleRSVP}
                disabled={rsvpMutation.isPending || rsvpStatus?.isGoing}
              >
                {rsvpMutation.isPending ? "..." : (rsvpStatus?.isGoing ? "Going" : "RSVP")}
              </Button>
            </AuthGuard>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-xs">{formatEventDate(event.startTime, event.timezone)}</span>
            </div>

            <div className="flex items-center gap-1">
              {isAttendeesLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2">
                    {attendeesData?.attendees?.slice(0, 3).map((person) => (
                      <Avatar key={person.id} className="h-5 w-5 border-2 border-background">
                        {person.avatarUrl ? (
                          <AvatarImage src={person.avatarUrl} alt={person.userName || ''} />
                        ) : (
                          <AvatarFallback className="text-[10px]">
                            {person.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs ml-1">
                    {attendeesData?.total || 0} attending
                  </span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-xs line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventList({ compact }: EventListProps) {
  const { data, isLoading, error } = useQuery<EventsResponse>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to load events');
      }
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-2.5">
        <p className="text-xs text-destructive">Failed to load events</p>
      </div>
    );
  }

  const now = new Date();
  const eventsArray = data?.events || [];

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
          className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground/80 transition-colors"
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
        <EventCard
          event={upcomingEvent}
          onSelect={(event) => setSelectedEvent(event)}
          compact={compact}
        />
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming events</p>
      )}

      {selectedEvent && (
        <PublicEventPreview
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          events={eventsArray}
          onNavigate={setSelectedEvent}
        />
      )}
    </div>
  );
}