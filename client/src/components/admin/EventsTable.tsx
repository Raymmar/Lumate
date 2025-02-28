import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Event } from "@shared/schema";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import { EventPreview } from "./EventPreview";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

export function EventsTable() {
  const [selectedEvent, setSelectedEvent] = useState<(Event & { isSynced: boolean; lastSyncedAt: string | null; api_id: string }) | null>(null);
  const [syncingEvents, setSyncingEvents] = useState<Set<string>>(new Set());

  const { data: events = [], isLoading } = useQuery<(Event & { isSynced: boolean; lastSyncedAt: string | null })[]>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const handleStartSync = (eventId: string) => {
    setSyncingEvents(prev => new Set([...prev, eventId]));
  };

  const handleSync = (eventId: string) => {
    // Update selected event's sync status optimistically
    if (selectedEvent && selectedEvent.api_id === eventId) {
      const now = new Date().toISOString();
      setSelectedEvent({
        ...selectedEvent,
        isSynced: true,
        lastSyncedAt: now
      });
    }
    // Remove from syncing set
    setSyncingEvents(prev => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  };

  const columns = [
    {
      key: "title",
      header: "Event Name",
      cell: (row: Event) => row.title,
    },
    {
      key: "startTime",
      header: "Start Date",
      cell: (row: Event) => format(new Date(row.startTime), "PPP"),
    },
    {
      key: "sync",
      header: "Sync Status",
      cell: (row: any) => {
        const isSyncing = syncingEvents.has(row.api_id);

        if (isSyncing) {
          return (
            <Badge variant="secondary" className="animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Syncing...
            </Badge>
          );
        }

        return (
          <Badge variant={row.isSynced ? "outline" : "secondary"}>
            {row.isSynced ? (
              <>
                Synced
                <span className="ml-1 text-xs text-muted-foreground">
                  ({format(new Date(row.lastSyncedAt!), "MMM d, h:mm a")})
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
      onClick: (event: Event) => {
        setSelectedEvent(event);
      },
    },
    {
      label: "Manage event",
      onClick: (event: Event) => {
        if (event.url) {
          window.open(event.url, '_blank');
        }
      },
    },
  ];

  const onRowClick = (event: Event) => {
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

      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {selectedEvent && (
            <EventPreview 
              event={selectedEvent} 
              onSync={handleSync}
              onStartSync={handleStartSync}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}