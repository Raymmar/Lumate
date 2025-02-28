import { Event } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, Globe, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EventPreviewProps {
  event: Event;
}

export function EventPreview({ event }: EventPreviewProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {event.coverUrl && (
        <div className="relative w-full aspect-video mb-4">
          <img
            src={event.coverUrl}
            alt={event.title}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{event.title}</h2>
          {event.description && (
            <p className="text-muted-foreground line-clamp-2">{event.description}</p>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(event.startTime), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.startTime), "h:mm a")} - 
                  {format(new Date(event.endTime), "h:mm a")}
                  {event.timezone && ` (${event.timezone})`}
                </p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  {event.location.full_address && (
                    <p className="font-medium">{event.location.full_address}</p>
                  )}
                  {event.location.city && (
                    <p className="text-sm text-muted-foreground">
                      {[
                        event.location.city,
                        event.location.region,
                        event.location.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {event.url && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Event Page
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}