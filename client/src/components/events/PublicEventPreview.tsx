import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewSidebar } from "@/components/admin/PreviewSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Person } from "@/components/people/PeopleDirectory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AuthGuard } from "@/components/AuthGuard";
import { DialogTitle } from "@/components/ui/dialog";

interface PublicEventPreviewProps {
  event: Event;
  onClose: () => void;
  events?: Event[];
  onNavigate?: (event: Event) => void;
}

export function PublicEventPreview({ event, onClose, events = [], onNavigate }: PublicEventPreviewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Add check for past events
  const isEventEnded = new Date(event.endTime + 'Z') < new Date();

  // Set up TipTap editor for rich text display
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
  });

  // Update editor content when event changes
  useEffect(() => {
    if (editor && event?.description !== undefined) {
      editor.commands.clearContent();
      if (event.description) {
        editor.commands.setContent(event.description);
      }
    }
  }, [editor, event?.description]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Find current event index and determine if we have prev/next
  const currentIndex = events.findIndex(e => e.id === event.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < events.length - 1;

  // Find the next upcoming event for the invite
  const now = new Date();
  const nextUpcomingEvent = events
    .filter(e => new Date(e.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  // Query to fetch attendees for this event
  const { data: attendees = [], isLoading: isLoadingAttendees } = useQuery<Person[]>({
    queryKey: [`/api/admin/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!event.api_id && !!user
  });

  // Query to check if user is RSVP'd
  const { data: rsvpStatus } = useQuery({
    queryKey: ['/api/events/check-rsvp', event.api_id],
    queryFn: async () => {
      const response = await fetch(`/api/events/check-rsvp?event_api_id=${event.api_id}`);
      if (!response.ok) throw new Error('Failed to check RSVP status');
      return response.json();
    },
    enabled: !!user && !!event.api_id
  });

  // Mutation for RSVP action
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
      queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] });
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
    <PreviewSidebar
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogTitle className="sr-only">Event Preview</DialogTitle>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pb-16">
          {event.coverUrl && (
            <div className="relative w-full aspect-video mb-4">
              <img
                src={event.coverUrl}
                alt={event.title}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{event.title}</h2>
              {event.description && (
                <div className="relative">
                  <div className={`prose prose-sm max-w-none dark:prose-invert ${!isExpanded ? 'line-clamp-4' : ''}`}>
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

            {/* RSVP Section */}
            {user ? (
              <Button
                variant={rsvpStatus?.isGoing ? "default" : "outline"}
                className={`w-full h-12 text-lg ${rsvpStatus?.isGoing && !isEventEnded ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                onClick={() => !rsvpStatus?.isGoing && !isEventEnded && rsvpMutation.mutate()}
                disabled={rsvpMutation.isPending || rsvpStatus?.isGoing || isEventEnded}
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
            ) : isSubmitted ? (
              <Card>
                <CardContent className="p-6">
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
                <CardContent className="p-6">
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
                      />
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        type="submit"
                        disabled={isInviting}
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
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    {isEventEnded ? "This event has already ended." : "No upcoming events available at the moment."}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Event Details Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {formatInTimeZone(
                        new Date(event.startTime + 'Z'),
                        event.timezone || 'America/New_York',
                        'EEEE, MMMM d, yyyy'
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatInTimeZone(new Date(event.startTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')} -
                      {formatInTimeZone(new Date(event.endTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')}
                      {event.timezone && ` (${event.timezone})`}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      {event.location.full_address && (
                        <p className="font-medium">{event.location.full_address}</p>
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

            {/* Attendees List */}
            {user && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Event Attendees</h3>
                    <Badge variant="secondary">{attendees.length} registered</Badge>
                  </div>

                  {isLoadingAttendees ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                      ))}
                    </div>
                  ) : attendees.length > 0 ? (
                    <div className="space-y-2">
                      {attendees.map((person) => (
                        <Link
                          key={person.id}
                          href={`/people/${person.api_id}`}
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            {person.avatarUrl ? (
                              <AvatarImage src={person.avatarUrl} alt={person.userName || ''} />
                            ) : (
                              <AvatarFallback>
                                {person.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium">{person.userName || "Anonymous"}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attendees yet. Be the first to RSVP!</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Navigation Section - Fixed to bottom */}
        {events.length > 1 && onNavigate && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                disabled={!hasPrevious}
                onClick={() => handleNavigate(events[currentIndex - 1])}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={!hasNext}
                onClick={() => handleNavigate(events[currentIndex + 1])}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PreviewSidebar>
  );
}