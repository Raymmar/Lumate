import { Event } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EventPreviewProps {
  event: Event;
}

export function EventPreview({ event }: EventPreviewProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAttendees = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/admin/events/${event.api_id}/guests`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }
      const data = await response.json();
      console.log('Attendees data:', data);
      toast({
        title: "Success",
        description: "Successfully fetched attendees data",
      });
    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync attendees",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
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
                className="bg-black/75 text-white hover:bg-black/90"
                onClick={() => window.open(event.url, '_blank')}
              >
                Manage event
              </Button>
            )}
            <Button
              variant="default"
              className="bg-black/75 text-white hover:bg-black/90"
              onClick={handleSyncAttendees}
              disabled={isSyncing}
            >
              <Users className="h-4 w-4 mr-2" />
              {isSyncing ? "Syncing..." : "Sync Attendees"}
            </Button>
          </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}