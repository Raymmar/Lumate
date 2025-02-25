import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface Event {
  api_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
}

function formatEventDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PPP p");
  } catch (error) {
    console.error("Invalid date format:", dateStr);
    return "Date not available";
  }
}

export default function EventList() {
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
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
        ) : events && Array.isArray(events) && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.api_id}
                className="p-4 rounded-lg border bg-card text-card-foreground"
              >
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatEventDate(event.start_time)}
                </p>
                <p className="text-sm mt-2">{event.description || "No description available"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No events available</p>
        )}
      </CardContent>
    </Card>
  );
}