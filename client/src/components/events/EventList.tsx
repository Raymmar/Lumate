import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isFuture } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

interface Event {
  api_id: string;
  name: string;  
  description: string | null;
  start_at: string;  
  end_at: string;    
  description_md?: string;
  cover_url?: string;
  event: {
    cover_url?: string;
    name: string;
    description: string;
    start_at: string;
    end_at: string;
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

function EventCard({ event }: { event: Event }) {
  const eventData = event.event || event;
  const description = eventData.description_md || eventData.description || "";

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
      <div className="mt-2 text-sm text-muted-foreground">
        <p>{formatEventDate(eventData.start_at)}</p>
      </div>
      <div className="text-sm mt-2 line-clamp-3 prose prose-sm dark:prose-invert">
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
              <div>
                <h3 className="text-lg font-semibold mb-4">Next Event</h3>
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