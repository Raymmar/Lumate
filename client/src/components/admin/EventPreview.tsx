import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

interface EventPreviewProps {
  event: Event & { isSynced?: boolean; lastSyncedAt?: string | null };
  onSync?: (eventId: string) => void;
  onStartSync?: (eventId: string) => void;
}

export function EventPreview({ event, onSync, onStartSync }: EventPreviewProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState({
    isSynced: event.isSynced,
    lastSyncedAt: event.lastSyncedAt
  });
  const queryClient = useQueryClient();

  const formatLastSyncTime = (dateStr: string) => {
    try {
      // First parse the date string, ensuring we interpret it as UTC
      const utcDate = new Date(dateStr + 'Z');

      return formatInTimeZone(
        utcDate,
        event.timezone || 'America/New_York', // Use event timezone if available
        'MMM d, h:mm aa zzz'
      );
    } catch (error) {
      console.error("Invalid date format:", dateStr, error);
      return "Date not available";
    }
  };

  const handleSyncAttendees = async () => {
    setIsSyncing(true);
    // Notify parent that sync is starting
    if (onStartSync) {
      onStartSync(event.api_id);
    }

    // Start the sync in the background
    fetch(`/api/admin/events/${event.api_id}/guests`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch attendees');
        }
        const data = await response.json();
        console.log('Attendees data:', data);

        // Optimistically update local state
        const now = new Date().toISOString();
        setLocalSyncStatus({
          isSynced: true,
          lastSyncedAt: now
        });

        // Notify parent component if callback exists
        if (onSync) {
          onSync(event.api_id);
        }

        toast({
          title: "Success",
          description: "Successfully synced attendees data",
        });

        // Invalidate events query to refresh sync status
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      })
      .catch((error) => {
        console.error('Error fetching attendees:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to sync attendees",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  // Use local state for rendering
  const syncStatus = localSyncStatus.isSynced;
  const lastSyncTime = localSyncStatus.lastSyncedAt;

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
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold">{event.title}</h2>
            <Badge variant={syncStatus ? "outline" : "secondary"}>
              {syncStatus ? (
                <>
                  Synced
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({formatLastSyncTime(lastSyncTime!)})
                  </span>
                </>
              ) : (
                "Not synced"
              )}
            </Badge>
          </div>
          {event.description && (
            <p className="text-muted-foreground line-clamp-2">{event.description}</p>
          )}
        </div>

        <Button
          variant="default"
          className="w-full bg-black/75 text-white hover:bg-black/90"
          onClick={handleSyncAttendees}
          disabled={isSyncing}
        >
          <Users className="h-4 w-4 mr-2" />
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing Attendees...
            </>
          ) : syncStatus ? (
            "Re-sync Attendees"
          ) : (
            "Sync Attendees"
          )}
        </Button>

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
  );
}