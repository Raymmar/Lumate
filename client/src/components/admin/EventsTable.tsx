import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Event } from "@shared/schema";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import { EventPreview } from "./EventPreview";
import { SyncDialog } from "./SyncDialog";
import { useToast } from "@/hooks/use-toast";

export function EventsTable() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    guestsProcessed: number;
    totalIterations: number;
    reachedLimit: boolean;
  }>();
  const { toast } = useToast();

  const { data: events = [], isLoading, refetch } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const handleSyncAttendees = async (event: Event) => {
    setIsSyncDialogOpen(true);
    setIsResetting(true);
    setSyncStatus("Initializing attendee sync...");
    setSyncProgress(0);
    setSyncLogs([]);
    setIsComplete(false);
    setSyncStats(undefined);

    try {
      const response = await fetch(`/api/admin/events/${event.api_id}/guests`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync attendees");
      }

      setIsComplete(true);
      setSyncStats({
        guestsProcessed: data.total,
        totalIterations: data.stats.totalIterations,
        reachedLimit: data.stats.reachedLimit
      });

      // Add success message to logs
      setSyncLogs(prev => [...prev, 
        `Successfully synced ${data.total} attendees`,
        `Made ${data.stats.totalIterations} API calls`,
        data.stats.reachedLimit ? "Note: Reached maximum pagination limit" : ""
      ].filter(Boolean));

    } catch (error) {
      console.error("Failed to sync attendees:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync attendees",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCloseSyncDialog = () => {
    setIsSyncDialogOpen(false);
    refetch(); // Refresh the events list
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
  ];

  const actions = [
    {
      label: "View details",
      onClick: (event: Event) => {
        setSelectedEvent(event);
      },
    },
    {
      label: "Sync attendees",
      onClick: (event: Event) => {
        handleSyncAttendees(event);
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
          {selectedEvent && <EventPreview event={selectedEvent} />}
        </SheetContent>
      </Sheet>

      <SyncDialog
        isOpen={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        isResetting={isResetting}
        syncStatus={syncStatus}
        syncProgress={syncProgress}
        syncLogs={syncLogs}
        isComplete={isComplete}
        syncStats={syncStats}
        onClose={handleCloseSyncDialog}
      />
    </>
  );
}