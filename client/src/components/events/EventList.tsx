import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

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
    return format(parseISO(dateStr), "PPP p");
  } catch (error) {
    console.error("Invalid date format:", dateStr);
    return "Date not available";
  }
}

export default function EventList() {
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    onSuccess: (data) => {
      console.log('Received events data:', data); // Debug log
    },
    onError: (error) => {
      console.error('Error fetching events:', error);
    }
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
            {events.map((event) => {
              console.log('Rendering event:', event); // Debug individual event
              const eventData = event.event || event; // Handle both nested and flat structures
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
                    <p>Starts: {formatEventDate(eventData.start_at)}</p>
                    <p>Ends: {formatEventDate(eventData.end_at)}</p>
                  </div>
                  <p className="text-sm mt-2">{eventData.description_md || eventData.description || "No description available"}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No events available</p>
        )}
      </CardContent>
    </Card>
  );
}