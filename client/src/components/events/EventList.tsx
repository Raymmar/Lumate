import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
    const targetTimezone = timezone || 'America/New_York';

    // Format the time from UTC directly into the target timezone
    // The date string from the database is in UTC
    return formatInTimeZone(
      dateStr,           // UTC timestamp from database
      targetTimezone,    // Target timezone (event's timezone)
      'MMM d, h:mm a',   // Format string
      { timeZone: 'UTC' } // Explicitly tell date-fns the input is UTC
    );
  } catch (error) {
    console.error("Invalid date format:", dateStr, error);
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

  const now = new Date();
  const eventsArray = data?.events || [];

  // Sort events by start time
  const sortedEvents = [...eventsArray].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // Split into upcoming and past events
  const upcomingEvents = sortedEvents.filter(event => 
    new Date(event.startTime) > now
  );

  const pastEvents = sortedEvents.filter(event => 
    new Date(event.startTime) <= now
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