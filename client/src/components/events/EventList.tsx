import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { parseISO } from "date-fns";
import { formatInTimeZone } from 'date-fns-tz';
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Event {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  coverUrl: string | null;
  url: string | null;
  timezone: string | null;
}

interface EventsResponse {
  events: Event[];
  total: number;
}

function formatEventDate(dateStr: string, timezone: string | null): string {
  try {
    // The timestamp from the database is already in the event's timezone
    const targetTimezone = timezone || 'America/New_York';

    // Format the date in the correct timezone without additional conversion
    return formatInTimeZone(
      dateStr,
      targetTimezone,
      'MMM d, h:mm a z' // Include timezone for verification
    );
  } catch (error) {
    console.error("Invalid date format:", dateStr);
    return "Date not available";
  }
}

function EventCard({ event }: { event: Event }) {
  return (
    <a 
      href={event.url || "#"} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div 
        className="p-4 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group"
      >
        {event.coverUrl && (
          <div className="mb-4 overflow-hidden rounded-md aspect-video">
            <img 
              src={event.coverUrl} 
              alt={event.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}
        <h3 className="font-semibold group-hover:text-primary transition-colors">{event.title}</h3>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{formatEventDate(event.startTime, event.timezone)}</span>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
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
      <Card className="col-span-1">
        <CardContent>
          <p className="text-destructive">Failed to load events</p>
        </CardContent>
      </Card>
    );
  }

  const eventsArray = data?.events || [];

  const sortedEvents = [...eventsArray].sort((a, b) => {
    const dateA = parseISO(a.startTime);
    const dateB = parseISO(b.startTime);
    return dateA.getTime() - dateB.getTime();
  });

  const now = new Date();
  const upcomingEvents = sortedEvents.filter(event => 
    parseISO(event.startTime) > now
  );
  const pastEvents = sortedEvents.filter(event => 
    parseISO(event.startTime) <= now
  ).reverse();

  const nextEvent = upcomingEvents[0];

  return (
    <Card className="col-span-1">
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : eventsArray.length > 0 ? (
          <div className="space-y-6">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
                <TabsTrigger value="past">Past Events</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {nextEvent && (
                  <div className="mb-4">
                    <EventCard event={nextEvent} />
                  </div>
                )}
                {upcomingEvents.slice(1).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {upcomingEvents.length === 0 && (
                  <p className="text-muted-foreground">No upcoming events</p>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
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