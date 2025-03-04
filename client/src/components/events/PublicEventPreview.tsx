import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreviewSidebar } from "@/components/admin/PreviewSidebar";

interface PublicEventPreviewProps {
  event: Event;
  onClose: () => void;
}

export function PublicEventPreview({ event, onClose }: PublicEventPreviewProps) {
  return (
    <PreviewSidebar 
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {event.coverUrl && (
          <div className="relative w-full aspect-video mb-4">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              {event.url && (
                <Button 
                  variant="default" 
                  className="bg-black hover:bg-black/90 text-white"
                  onClick={() => event.url && window.open(event.url, '_blank')}
                >
                  Register for event
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">{event.title}</h2>
            {event.description && (
              <p className="text-muted-foreground mb-4">{event.description}</p>
            )}
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatInTimeZone(
                      new Date(event.startTime + 'Z'),
                      event.timezone || 'America/New_York',
                      'EEEE, MMMM d, yyyy'
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimeZone(new Date(event.startTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')} - 
                    {formatInTimeZone(new Date(event.endTime + 'Z'), event.timezone || 'America/New_York', 'h:mm a')}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </PreviewSidebar>
  );
}
