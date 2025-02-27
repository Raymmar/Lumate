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

function EventCard({ event, showImage = false }: { event: Event, showImage?: boolean }) {
  return (
    <a 
      href={event.url || "#"} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div className="p-3 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group">
        {showImage && event.coverUrl && (
          <div className="mb-3 overflow-hidden rounded-md aspect-[2/1]">
            <img 
              src={event.coverUrl} 
              alt={event.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}
        <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="text-xs">{formatEventDate(event.startTime, event.timezone)}</span>
          </div>

          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
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
      <div className="rounded-lg border bg-destructive/10 p-3">
        <p className="text-xs text-destructive">Failed to load events</p>
      </div>
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
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Events</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : eventsArray.length > 0 ? (
        <div className="space-y-3">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
              <TabsTrigger value="past" className="text-xs">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-2 mt-2">
              {nextEvent && (
                <div className="mb-2">
                  <EventCard event={nextEvent} showImage={true} />
                </div>
              )}
              {upcomingEvents.slice(1).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {upcomingEvents.length === 0 && (
                <p className="text-xs text-muted-foreground">No upcoming events</p>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-2 mt-2">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {pastEvents.length === 0 && (
                <p className="text-xs text-muted-foreground">No past events</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No events available</p>
      )}
    </div>
  );
}