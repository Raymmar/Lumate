import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { formatInTimeZone } from 'date-fns-tz';
import type { Event } from "@shared/schema";
import { useState } from "react";
import { EventPreview } from "./EventPreview";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { PreviewSidebar } from "./PreviewSidebar";

interface EventWithSync extends Event {
  isSynced: boolean;
  lastSyncedAt: string | null;
  lastAttendanceSync: string | null;
}

export function EventsTable() {
  const [selectedEvent, setSelectedEvent] = useState<EventWithSync | null>(null);
  const [syncingEvents, setSyncingEvents] = useState<string[]>([]);

  const { data: events = [], isLoading } = useQuery<EventWithSync[]>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const handleStartSync = (eventId: string) => {
    setSyncingEvents(prev => [...prev, eventId]);
  };

  const handleSync = (eventId: string) => {
    setSyncingEvents(prev => prev.filter(id => id !== eventId));
  };

  const formatLastSyncTime = (dateStr: string | null, timezone: string | null) => {
    if (!dateStr) return "Never synced";

    try {
      // First parse the date string, ensuring we interpret it as UTC
      const utcDate = new Date(dateStr + 'Z');

      return formatInTimeZone(
        utcDate,
        timezone || 'America/New_York',
        'MMM d, h:mm aa zzz'
      );
    } catch (error) {
      console.error("Invalid date format:", dateStr, error);
      return "Date not available";
    }
  };

  const columns = [
    {
      key: "title",
      header: "Event Name",
      cell: (row: EventWithSync) => row.title,
    },
    {
      key: "startTime",
      header: "Start Date",
      cell: (row: EventWithSync) => formatLastSyncTime(row.startTime, row.timezone),
    },
    {
      key: "sync",
      header: "Sync Status",
      cell: (row: EventWithSync) => {
        const isSyncing = syncingEvents.includes(row.api_id);
        const isSynced = row.lastAttendanceSync !== null;

        if (isSyncing) {
          return (
            <Badge variant="secondary" className="animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Syncing...
            </Badge>
          );
        }

        return (
          <Badge variant={isSynced ? "outline" : "secondary"}>
            {isSynced ? (
              <>
                Synced
                <span className="ml-1 text-xs text-muted-foreground">
                  ({formatLastSyncTime(row.lastAttendanceSync, row.timezone)})
                </span>
              </>
            ) : (
              "Not synced"
            )}
          </Badge>
        );
      },
    },
  ];

  const actions = [
    {
      label: "View details",
      onClick: (event: EventWithSync) => {
        setSelectedEvent(event);
      },
    },
    {
      label: "Manage event",
      onClick: (event: EventWithSync) => {
        if (event.url) {
          window.open(event.url, '_blank');
        }
      },
    },
  ];

  const onRowClick = (event: EventWithSync) => {
    setSelectedEvent(event);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataTable 
        data={events} 
        columns={columns}
        actions={actions}
        onRowClick={onRowClick}
      />

      <PreviewSidebar 
        open={!!selectedEvent} 
        onOpenChange={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventPreview 
            event={selectedEvent} 
            onSync={handleSync}
            onStartSync={handleStartSync}
          />
        )}
      </PreviewSidebar>
    </>
  );
}