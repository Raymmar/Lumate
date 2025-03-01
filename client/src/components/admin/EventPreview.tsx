import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Person } from "@/components/people/PeopleDirectory";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EventPreviewProps {
  event: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  };
  onSync?: (eventId: string) => void;
  onStartSync?: (eventId: string) => void;
}

export function EventPreview({ event, onSync, onStartSync }: EventPreviewProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState({
    isSynced: !!event.lastAttendanceSync,
    lastSyncedAt: event.lastAttendanceSync
  });
  const queryClient = useQueryClient();

  // Query to fetch attendees for this event
  const { data: attendees = [], isLoading: isLoadingAttendees } = useQuery<Person[]>({
    queryKey: [`/api/admin/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!event.api_id
  });

  const formatLastSyncTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never synced";

    try {
      // First parse the date string, ensuring we interpret it as UTC
      const utcDate = new Date(dateStr + 'Z');

      return formatInTimeZone(
        utcDate,
        event.timezone || 'America/New_York',
        'MMM d, h:mm aa zzz'
      );
    } catch (error) {
      console.error("Invalid date format:", dateStr, error);
      return "Date not available";
    }
  };

  const handleSyncAttendees = async () => {
    setIsSyncing(true);
    if (onStartSync) {
      onStartSync(event.api_id);
    }

    fetch(`/api/admin/events/${event.api_id}/guests`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch attendees');
        }
        const data = await response.json();

        // Optimistically update local state
        const now = new Date().toISOString();
        setLocalSyncStatus({
          isSynced: true,
          lastSyncedAt: now
        });

        if (onSync) {
          onSync(event.api_id);
        }

        toast({
          title: "Success",
          description: "Successfully synced attendees data",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] });
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

  // Derive sync status from attendees count and last sync time
  const hasSyncedAttendees = attendees.length > 0;
  const syncStatus = localSyncStatus.isSynced || hasSyncedAttendees;
  const lastSyncTime = localSyncStatus.lastSyncedAt || event.lastAttendanceSync;

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
                className="bg-black hover:bg-black/90 text-white"
                onClick={() => event.url && window.open(event.url, '_blank')}
              >
                Manage event
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">{event.title}</h2>
          {event.description && (
            <p className="text-muted-foreground line-clamp-2 mb-4">{event.description}</p>
          )}

          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full bg-black hover:bg-black/90 text-white"
              onClick={handleSyncAttendees}
              disabled={isSyncing}
            >
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

            <div className="flex items-center justify-center">
              <Badge variant={syncStatus ? "outline" : "secondary"}>
                {syncStatus ? (
                  <>
                    Synced
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({formatLastSyncTime(lastSyncTime)})
                    </span>
                  </>
                ) : (
                  "Not synced"
                )}
              </Badge>
            </div>
          </div>
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

        {/* Attendees List */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Event Attendees</h3>
              <Badge variant="secondary">{attendees.length} registered</Badge>
            </div>

            {isLoadingAttendees ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : attendees.length > 0 ? (
              <div className="space-y-2">
                {attendees.map((person) => (
                  <Link 
                    key={person.id} 
                    href={`/people/${person.api_id}`}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      {person.avatarUrl ? (
                        <AvatarImage src={person.avatarUrl} alt={person.userName || ''} />
                      ) : (
                        <AvatarFallback>
                          {person.userName?.split(" ").map((n) => n[0]).join("") || "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{person.userName || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{person.email}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendees found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}