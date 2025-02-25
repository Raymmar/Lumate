import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
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
        ) : (
          <div className="space-y-4">
            {events?.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg border bg-card text-card-foreground"
              >
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.startTime), "PPP p")}
                </p>
                <p className="text-sm mt-2">{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
