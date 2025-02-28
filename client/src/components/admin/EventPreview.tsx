import { Event } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface EventPreviewProps {
  event: Event;
}

export function EventPreview({ event }: EventPreviewProps) {
  const { toast } = useToast();

  const handleSyncAttendees = async () => {
    try {
      const response = await fetch(`https://api.lu.ma/public/v1/event/get-guests?event_api_id=${event.api_id}`, {
        headers: {
          'accept': 'application/json',
          'x-luma-api-key': import.meta.env.VITE_LUMA_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }

      const data = await response.json();
      console.log('Luma guests response:', data);

      toast({
        title: "Success",
        description: "Successfully fetched attendees from Luma",
      });
    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendees from Luma",
        variant: "destructive",
      });
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
          {event.url && (
            <div className="absolute bottom-4 left-4">
              <Button 
                variant="default" 
                className="bg-black/75 text-white hover:bg-black/90"
                onClick={() => event.url && window.open(event.url, '_blank')}
              >
                Manage event
              </Button>
            </div>
          )}
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

            <div className="pt-2">
              <Button 
                onClick={handleSyncAttendees}
                variant="outline"
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                Sync Attendees
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}