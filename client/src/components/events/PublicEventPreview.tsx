import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewSidebar } from "@/components/admin/PreviewSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Person } from "@/components/people/PeopleDirectory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PublicEventPreviewProps {
  event: Event;
  onClose: () => void;
}

export function PublicEventPreview({ event, onClose }: PublicEventPreviewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch attendees for this event
  const { data: attendees = [], isLoading: isLoadingAttendees } = useQuery<Person[]>({
    queryKey: [`/api/admin/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!event.api_id
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

  return (
    <PreviewSidebar 
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="flex flex-col h-full overflow-y-auto">
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
              <p className="text-muted-foreground mb-4">{event.description}</p>
            )}
          </div>

          {/* RSVP Button - Full Width */}
          {user ? (
            <Button 
              variant={rsvpStatus?.isGoing ? "default" : "outline"}
              className={`w-full h-12 text-lg ${rsvpStatus?.isGoing ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
              onClick={() => !rsvpStatus?.isGoing && rsvpMutation.mutate()}
              disabled={rsvpMutation.isPending || rsvpStatus?.isGoing}
            >
              {rsvpMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : rsvpStatus?.isGoing ? (
                "See you there!"
              ) : (
                "RSVP Now"
              )}
            </Button>
          ) : event.url && (
            <Button 
              variant="default"
              className="w-full h-12 text-lg"
              onClick={() => window.open(event.url, '_blank')}
            >
              Register for Event
            </Button>
          )}

          {/* Attendees List - Only show for logged in users */}
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
                      <div 
                        key={person.id}
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attendees yet. Be the first to RSVP!</p>
                )}
              </CardContent>
            </Card>
          )}

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
        </div>
      </div>
    </PreviewSidebar>
  );
}