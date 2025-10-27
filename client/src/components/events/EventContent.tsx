import { Event, Person } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, Loader2, ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { formatUsernameForUrl } from "@/lib/utils";

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

interface EventContentProps {
  event: Event;
  events?: Event[];
  onNavigate?: (event: Event) => void;
  showNavigation?: boolean;
}

export function EventContent({
  event,
  events = [],
  onNavigate,
  showNavigation = false
}: EventContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isEventEnded = new Date(event.endTime + 'Z') < new Date();

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
  });

  useEffect(() => {
    if (editor && event?.description !== undefined) {
      editor.commands.clearContent();
      if (event.description) {
        editor.commands.setContent(event.description);
      }
    }
  }, [editor, event?.description]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const currentIndex = events.findIndex(e => e.id === event.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < events.length - 1;

  const now = new Date();
  const nextUpcomingEvent = events
    .filter(e => new Date(e.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const { data: attendeesData, isLoading: isLoadingAttendees } = useQuery<{ attendees: Person[]; total: number }>({
    queryKey: [`/api/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      const data = await response.json();
      const filteredAttendees = data.attendees ? data.attendees.filter((person: Person) =>
        person.userName && person.userName.toLowerCase() !== "anonymous"
      ) : [];
      return {
        attendees: filteredAttendees,
        total: filteredAttendees.length
      };
    },
    enabled: !!event.api_id,
    staleTime: 30000
  });

  const { data: rsvpStatus } = useQuery({
    queryKey: ['/api/events/check-rsvp', event.api_id],
    queryFn: async () => {
      const response = await fetch(`/api/events/check-rsvp?event_api_id=${event.api_id}`);
      if (!response.ok) throw new Error('Failed to check RSVP status');
      return response.json();
    },
    enabled: !!user && !!event.api_id
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const response = await fetch('/api/events/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          event_api_id: nextUpcomingEvent?.api_id
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
      setIsInviting(false);
    }
  };

  const handleNavigate = (nextEvent: Event) => {
    if (onNavigate) {
      onNavigate(nextEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {event.coverUrl && (
          <div className="relative w-full aspect-video mb-6 group">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="w-full h-full object-cover rounded-lg"
              data-testid="img-event-cover"
            />

            {event.tags && event.tags.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg">
                <div className="flex gap-2">
                  {event.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-black/30 hover:bg-black/40 text-white border-none"
                      data-testid={`badge-tag-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-4" data-testid="text-event-title">{event.title}</h1>
            {event.description && (
              <div className="relative">
                <div className={`prose prose-lg max-w-none dark:prose-invert ${!isExpanded ? 'line-clamp-4' : ''}`}>
                  <EditorContent editor={editor} />
                </div>
                {event.description.length > 200 && (
                  <Button
                    variant="link"
                    className="px-0 font-medium"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {user ? (
            <div className="space-y-3">
              <Button
                variant={rsvpStatus?.isGoing ? "default" : "outline"}
                className={`w-full h-12 text-lg ${rsvpStatus?.isGoing && !isEventEnded ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                onClick={() => !rsvpStatus?.isGoing && !isEventEnded && rsvpMutation.mutate()}
                disabled={rsvpMutation.isPending || rsvpStatus?.isGoing || isEventEnded}
                data-testid="button-rsvp"
              >
                {rsvpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : isEventEnded ? (
                  "Event has ended"
                ) : rsvpStatus?.isGoing ? (
                  "You're in"
                ) : (
                  "RSVP Now"
                )}
              </Button>
              {rsvpStatus?.isGoing && !isEventEnded && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(generateCalendarUrl(event), '_blank')}
                  data-testid="button-add-to-calendar"
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              )}
            </div>
          ) : isSubmitted ? (
            <Card>
              <CardContent className="p-3 md:p-4">
                <h3 className="font-semibold mb-2">Welcome to Sarasota Tech</h3>
                <p className="text-sm text-muted-foreground">
                  Thanks for joining! We've sent an invite to your email for our next event.
                  Once you receive it, you can claim your profile to track your attendance and
                  stay connected with the community.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Be sure to check your inbox (or spam folder) for the invitation email.
                </p>
              </CardContent>
            </Card>
          ) : nextUpcomingEvent && !isEventEnded ? (
            <Card>
              <CardContent className="p-3 md:p-4">
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email"
                      type="email"
                      className="flex-1"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isInviting}
                      data-testid="input-email"
                    />
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      type="submit"
                      disabled={isInviting}
                      data-testid="button-submit-rsvp"
                    >
                      {isInviting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "RSVP"
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Drop your email for an invite to our next event on{' '}
                    {formatInTimeZone(
                      new Date(nextUpcomingEvent.startTime + 'Z'),
                      nextUpcomingEvent.timezone || 'America/New_York',
                      'MMMM d'
                    )}{' '}
                    and start networking with the region's top tech professionals.
                  </p>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-3 md:p-4">
                <p className="text-sm text-muted-foreground">
                  {isEventEnded ? "This event has already ended." : "No upcoming events available at the moment."}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3 md:p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium" data-testid="text-event-date">
                    {formatInTimeZone(
                      new Date(event.startTime + 'Z'),
                      event.timezone || 'America/New_York',
                      'EEEE, MMMM d, yyyy'
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-event-time">
                    {formatInTimeZone(new Date(event.startTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')} -
                    {formatInTimeZone(new Date(event.endTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')}
                    {event.timezone && ` (${event.timezone})`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    {event.location.full_address && (
                      <p className="font-medium" data-testid="text-event-location">{event.location.full_address}</p>
                    )}
                    {event.location.city && (
                      <p className="text-sm text-muted-foreground">
                        {[
                          event.location.city,
                          event.location.region,
                          event.location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Event Attendees</h3>
                <Badge variant="secondary" data-testid="badge-attendee-count">{attendeesData?.total || 0} registered</Badge>
              </div>

              {isLoadingAttendees ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : attendeesData?.attendees?.length > 0 ? (
                <div className="space-y-2">
                  {attendeesData.attendees.map((person) => {
                    const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;
                    return (
                      <Link
                        key={person.id}
                        href={profilePath}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                        data-testid={`link-attendee-${person.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          {person.avatarUrl && (
                            <AvatarImage src={person.avatarUrl} alt={person.userName || ''} />
                          )}
                          <AvatarFallback>
                            {person.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{person.userName || "Anonymous"}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendees yet. Be the first to RSVP!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showNavigation && events.length > 1 && onNavigate && (
        <div className="border-t bg-background p-4 mt-8">
          <div className="flex justify-between items-center max-w-full">
            <Button
              variant="ghost"
              disabled={!hasPrevious}
              onClick={() => handleNavigate(events[currentIndex - 1])}
              className="min-w-[100px] h-10"
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={!hasNext}
              onClick={() => handleNavigate(events[currentIndex + 1])}
              className="min-w-[100px] h-10"
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
