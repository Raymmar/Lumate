import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isFuture } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

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
    guest_count?: number;
    approved_guest_count?: number;
    capacity?: number;
    waitlist_count?: number;
    geo_address_json?: string | null;
  };
}

function formatEventDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, h:mm a");
  } catch (error) {
    console.error("Invalid date format:", dateStr);
    return "Date not available";
  }
}

function parseAddressJson(jsonStr: string | null | undefined): string | null {
  if (!jsonStr) return null;
  try {
    if (jsonStr.trim().startsWith('{')) {
      const parsed = JSON.parse(jsonStr);
      return parsed.full_address || parsed.formatted_address || parsed.address || `${parsed.city}, ${parsed.region}`;
    }
    return jsonStr;
  } catch (error) {
    console.error('Failed to parse address JSON:', error);
    return null;
  }
}

function EventCard({ event }: { event: Event }) {
  const eventData = event.event || event;
  const description = eventData.description || "";
  const location = parseAddressJson(eventData.geo_address_json);

  return (
    <div
      key={event.api_id}
      className="p-4 rounded-lg border bg-card text-card-foreground"
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

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{formatEventDate(eventData.start_at)}</span>
        </div>

        {location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        )}

        {(eventData.guest_count !== undefined || eventData.approved_guest_count !== undefined) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {eventData.guest_count || eventData.approved_guest_count || 0} attendees
              {eventData.approved_guest_count !== eventData.guest_count && 
                eventData.approved_guest_count !== undefined &&
                ` (${eventData.approved_guest_count} approved)`}
              {eventData.capacity && ` / ${eventData.capacity} capacity`}
              {eventData.waitlist_count ? ` (${eventData.waitlist_count} waitlisted)` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm prose prose-sm dark:prose-invert">
        <ReactMarkdown>{description}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function EventList() {
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
                <EventCard event={nextEvent} />
              </div>
            )}

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
                <TabsTrigger value="past">Past Events</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {upcomingEvents.slice(1).map((event) => (
                  <EventCard key={event.api_id} event={event} />
                ))}
                {upcomingEvents.length <= 1 && (
                  <p className="text-muted-foreground">No more upcoming events</p>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {pastEvents.map((event) => (
                  <EventCard key={event.api_id} event={event} />
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
  );
}