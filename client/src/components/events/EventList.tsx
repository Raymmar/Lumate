import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from 'date-fns-tz';
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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

function EventCard({ event }: { event: Event }) {
  return (
    <a 
      href={event.url || "#"} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block"
    >
      <div className="flex gap-3 p-2.5 rounded-lg border bg-card text-card-foreground hover:border-primary transition-colors group">
        {/* Event thumbnail */}
        <div className="flex-none w-16">
          <AspectRatio ratio={1}>
            {event.coverUrl ? (
              <img
                src={event.coverUrl}
                alt={event.title}
                className="rounded object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </AspectRatio>
        </div>

        {/* Event details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>
          <div className="mt-1.5 space-y-1">
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
      <div className="rounded-lg border bg-destructive/10 p-2.5">
        <p className="text-xs text-destructive">Failed to load events</p>
      </div>
    );
  }

  const now = new Date();
  const eventsArray = data?.events || [];

  // Sort events by start time and get the next upcoming event
  const upcomingEvent = eventsArray
    .filter(event => new Date(event.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[88px]" />
        </div>
      ) : upcomingEvent ? (
        <EventCard event={upcomingEvent} />
      ) : (
        <p className="text-xs text-muted-foreground">No upcoming events</p>
      )}
    </div>
  );
}