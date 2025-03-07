import { Event } from "@shared/schema";
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar, MapPin, Users, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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
  events?: (Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  })[];
  onSync?: (eventId: string) => void;
  onStartSync?: (eventId: string) => void;
  onNavigate?: (event: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  }) => void;
}

export function EventPreview({ event, events = [], onSync, onStartSync, onNavigate }: EventPreviewProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [localSyncStatus, setLocalSyncStatus] = useState({
    isSynced: !!event.lastAttendanceSync,
    lastSyncedAt: event.lastAttendanceSync
  });
  const queryClient = useQueryClient();

  const { data: attendanceData = { attendees: [], total: 0 }, isLoading: isLoadingAttendees } = useQuery({
    queryKey: [`/api/admin/events/${event.api_id}/attendees`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/events/${event.api_id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!event.api_id
  });

  const attendees = attendanceData.attendees;
  const attendeeCount = attendanceData.total;

  const formatLastSyncTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never synced";

    try {
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

    try {
      const response = await fetch(`/api/admin/events/${event.api_id}/guests`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendees');
      }

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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendance`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/stats`] })
      ]);

    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync attendees",
        variant: "destructive",
      });

      setLocalSyncStatus({
        isSynced: !!event.lastAttendanceSync,
        lastSyncedAt: event.lastAttendanceSync
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAttendance = async () => {
    try {
      setLocalSyncStatus({
        isSynced: false,
        lastSyncedAt: null
      });

      queryClient.setQueryData([`/api/admin/events/${event.api_id}/attendees`],
        () => ({ attendees: [], total: 0 })
      );

      const response = await fetch(`/api/admin/events/${event.api_id}/attendance`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear attendance');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendance`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/stats`] })
      ]);

      toast({
        title: "Success",
        description: "Event attendance cleared successfully.",
      });
    } catch (error) {
      console.error('Error clearing attendance:', error);
      toast({
        title: "Error",
        description: "Failed to clear attendance. Please try again.",
        variant: "destructive",
      });

      setLocalSyncStatus({
        isSynced: !!event.lastAttendanceSync,
        lastSyncedAt: event.lastAttendanceSync
      });

      await queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/events/${event.api_id}/attendees`] 
      });
    }
  };

  const hasSyncedAttendees = attendees.length > 0;
  const syncStatus = localSyncStatus.isSynced || hasSyncedAttendees;
  const lastSyncTime = localSyncStatus.lastSyncedAt || event.lastAttendanceSync;

  const currentIndex = events.findIndex(e => e.id === event.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < events.length - 1;

  const handleNavigate = (nextEvent: Event & { 
    isSynced?: boolean; 
    lastSyncedAt?: string | null;
    lastAttendanceSync?: string | null;
  }) => {
    if (onNavigate) {
      onNavigate(nextEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-16">
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

              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearAttendance}
                disabled={isSyncing || !hasSyncedAttendees}
              >
                Clear Attendance
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Event Attendees</h3>
                <Badge variant="secondary">{attendeeCount} registered</Badge>
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

      {events.length > 1 && onNavigate && (
        <div className="border-t bg-background py-4">
          <div className="flex justify-between items-center px-4">
            <Button
              variant="ghost"
              disabled={!hasPrevious}
              onClick={() => handleNavigate(events[currentIndex - 1])}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={!hasNext}
              onClick={() => handleNavigate(events[currentIndex + 1])}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}