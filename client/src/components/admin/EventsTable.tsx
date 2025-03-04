import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { formatInTimeZone } from 'date-fns-tz';
import type { Event } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { EventPreview } from "./EventPreview";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { PreviewSidebar } from "./PreviewSidebar";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventWithSync extends Event {
  isSynced: boolean;
  lastSyncedAt: string | null;
  lastAttendanceSync: string | null;
}

interface EventsResponse {
  events: EventWithSync[];
  total: number;
}

interface SyncProgress {
  message: string;
  progress: number;
  data?: {
    total: number;
    success: number;
    failure: number;
  };
  type?: string;
}

export function EventsTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<EventWithSync | null>(null);
  const [syncingEvents, setSyncingEvents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const itemsPerPage = 100;

  // Auto-scroll effect for logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [syncLogs]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/events", currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/admin/events?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
        );
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        return data as EventsResponse;
      } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const events = data?.events || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleStartSync = async (eventId: string) => {
    setSyncingEvents(prev => [...prev, eventId]);
    setSyncProgress({ message: "Starting sync...", progress: 0 });
    setSyncLogs([]);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/guests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to initialize stream reader');
      }

      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const messages = chunk.split('\n\n').filter(Boolean);

          for (const message of messages) {
            if (message.startsWith('data: ')) {
              try {
                const jsonStr = message.slice(6).trim();
                if (!jsonStr) {
                  console.warn('Empty SSE message received');
                  continue;
                }

                let data;
                try {
                  data = JSON.parse(jsonStr);
                } catch (jsonError) {
                  console.warn('Invalid JSON received:', jsonStr);
                  continue;
                }

                if (!data || typeof data.message !== 'string' || typeof data.progress !== 'number') {
                  console.warn('Invalid data structure received:', data);
                  continue;
                }

                setSyncProgress({
                  message: data.message,
                  progress: data.progress,
                  data: data.data,
                  type: data.type
                });

                setSyncLogs(logs => [...logs, `${new Date().toLocaleTimeString()}: ${data.message}`]);

                if (data.type === 'complete') {
                  setSyncingEvents(prev => prev.filter(id => id !== eventId));
                  await queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
                  toast({
                    title: "Success",
                    description: "Attendance sync completed successfully.",
                  });
                }
              } catch (parseError) {
                console.warn('Error processing SSE message:', parseError);
              }
            }
          }
        } catch (readError) {
          console.error('Error reading SSE stream:', readError);
          break;
        }
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast({
        title: "Error",
        description: "Failed to start sync process. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (syncingEvents.includes(eventId)) {
        setSyncingEvents(prev => prev.filter(id => id !== eventId));
      }
    }
  };

  const formatLastSyncTime = (dateStr: string | null, timezone: string | null) => {
    if (!dateStr) return "Never synced";

    try {
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
            <div className="space-y-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </Badge>
              {syncProgress && (
                <>
                  <Progress value={syncProgress.progress} className="h-2" />
                  <div className="space-y-1">
                    {/* Fixed height message area */}
                    <div className="min-h-[20px]">
                      <p className="text-xs text-muted-foreground">{syncProgress.message}</p>
                    </div>
                    {syncProgress.data && (
                      <p className="text-xs text-muted-foreground">
                        Processed: {syncProgress.data.total} (Success: {syncProgress.data.success}, Failed: {syncProgress.data.failure})
                      </p>
                    )}
                  </div>
                  {/* Fixed height scroll area with auto-scroll */}
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                    <div className="space-y-1">
                      {syncLogs.map((log, index) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          {log}
                        </p>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
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

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search events..."
          isLoading={isFetching}
        />
      </div>

      <div className="min-h-[400px] relative mt-4">
        <div 
          className={`transition-opacity duration-300 ${
            isFetching ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <DataTable 
            data={events} 
            columns={columns}
            actions={actions}
            onRowClick={onRowClick}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-4">
                Page {currentPage} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <PreviewSidebar 
        open={!!selectedEvent} 
        onOpenChange={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventPreview 
            event={selectedEvent} 
            onSync={handleStartSync}
            onStartSync={handleStartSync}
          />
        )}
      </PreviewSidebar>
    </div>
  );
}