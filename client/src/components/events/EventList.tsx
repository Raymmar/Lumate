import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isFuture } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

interface Event {
  api_id: string;
  name: string;  
  description: string | null;
  start_at: string;  
  end_at: string;    
  cover_url?: string;
  event: {
    cover_url?: string;
    name: string;
    description: string;
    start_at: string;
    end_at: string;
  };
}

interface EventDetails extends Event {
  location?: string;
  guest_count?: number;
  capacity?: number;
  is_private?: boolean;
}

function formatEventDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, h:mm a");
  } catch (error) {
    console.error("Invalid date format:", dateStr);
    return "Date not available";
  }
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const eventData = event.event || event;
  const description = eventData.description || "";

  return (
    <div
      key={event.api_id}
      className="p-4 rounded-lg border bg-card text-card-foreground hover:border-primary cursor-pointer transition-colors"
      onClick={onClick}
    >
      {eventData.cover_url && (
        <div className="mb-4 w-full h-40 rounded-lg overflow-hidden">
          <img 
            src={eventData.cover_url} 
            alt={eventData.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h3 className="font-semibold">{eventData.name}</h3>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>{formatEventDate(eventData.start_at)}</p>
      </div>
      <div className="text-sm mt-2 line-clamp-3 prose prose-sm dark:prose-invert">
        <ReactMarkdown>{description}</ReactMarkdown>
      </div>
    </div>
  );
}

function EventDetailsModal({ 
  event, 
  isOpen, 
  onClose 
}: { 
  event: Event | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { data: eventDetails } = useQuery<EventDetails>({
    queryKey: [`/api/events/${event?.api_id}`],
    enabled: isOpen && !!event?.api_id,
  });

  if (!event) return null;

  const eventData = eventDetails || event;
  const description = eventData.event?.description || eventData.description || "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventData.event?.name || eventData.name}</DialogTitle>
        </DialogHeader>
        {eventData.event?.cover_url && (
          <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden mb-4">
            <img
              src={eventData.event.cover_url}
              alt={eventData.event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {formatEventDate(eventData.event?.start_at || eventData.start_at)}
            </span>
          </div>
          {eventDetails?.guest_count !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {eventDetails.guest_count} guests
                {eventDetails.capacity && ` / ${eventDetails.capacity} capacity`}
              </span>
            </div>
          )}
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EventList() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { data: events = [], isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"]
  });

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load events</p>
        </CardContent>
      </Card>
    );
  }

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = parseISO((a.event || a).start_at);
    const dateB = parseISO((b.event || b).start_at);
    return dateA.getTime() - dateB.getTime();
  });

  const now = new Date();
  const upcomingEvents = sortedEvents.filter(event => 
    isFuture(parseISO((event.event || event).start_at))
  );
  const pastEvents = sortedEvents.filter(event => 
    !isFuture(parseISO((event.event || event).start_at))
  ).reverse();

  const nextEvent = upcomingEvents[0];

  return (
    <>
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-6">
              {nextEvent && (
                <div className="mb-4">
                  <EventCard 
                    event={nextEvent} 
                    onClick={() => setSelectedEvent(nextEvent)} 
                  />
                </div>
              )}

              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
                  <TabsTrigger value="past">Past Events</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="space-y-4 mt-4">
                  {upcomingEvents.slice(1).map((event) => (
                    <EventCard 
                      key={event.api_id} 
                      event={event} 
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))}
                  {upcomingEvents.length <= 1 && (
                    <p className="text-muted-foreground">No more upcoming events</p>
                  )}
                </TabsContent>

                <TabsContent value="past" className="space-y-4 mt-4">
                  {pastEvents.map((event) => (
                    <EventCard 
                      key={event.api_id} 
                      event={event}
                      onClick={() => setSelectedEvent(event)}
                    />
                  ))}
                  {pastEvents.length === 0 && (
                    <p className="text-muted-foreground">No past events</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="text-muted-foreground">No events available</p>
          )}
        </CardContent>
      </Card>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}