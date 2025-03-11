import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { formatInTimeZone } from 'date-fns-tz';
import type { Event } from "@shared/schema";
import { useState } from "react";
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
  const [clearingEvents, setClearingEvents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const itemsPerPage = 100;

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
    // Optimistically update the selected event's sync status
    if (selectedEvent && selectedEvent.api_id === eventId) {
      setSelectedEvent(prev => prev ? {
        ...prev,
        isSynced: true,
        lastAttendanceSync: new Date().toISOString()
      } : null);
    }

    // Optimistically update the events list
    queryClient.setQueryData(["/api/admin/events", currentPage, itemsPerPage, debouncedSearch],
      (oldData: EventsResponse | undefined) => {
        if (!oldData) return undefined;
        return {
          ...oldData,
          events: oldData.events.map(event =>
            event.api_id === eventId ? {
              ...event,
              isSynced: true,
              lastAttendanceSync: new Date().toISOString()
            } : event
          )
        };
      }
    );

    setSyncingEvents(prev => [...prev, eventId]);
    setSyncProgress({ message: "Starting sync...", progress: 0 });

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
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const messages = chunk.split('\n\n').filter(Boolean);

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const jsonStr = message.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);
              if (!data || typeof data.message !== 'string' || typeof data.progress !== 'number') continue;

              setSyncProgress({
                message: data.message,
                progress: data.progress,
                data: data.data,
                type: data.type
              });

              if (data.type === 'complete') {
                setSyncingEvents(prev => prev.filter(id => id !== eventId));

                // Invalidate all relevant queries to ensure data consistency
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
                  queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}`] }),
                  queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/attendees`] }),
                  queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/attendees`] }), // Public attendees
                  queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${eventId}/attendance`] }),
                  queryClient.invalidateQueries({ queryKey: ["/api/events"] }), // Public events list
                  queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
                  queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] }),
                  queryClient.invalidateQueries({ queryKey: ["/api/public/stats"] }), // Public stats
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }), // Admin dashboard stats
                  queryClient.invalidateQueries({ queryKey: ["/api/bulletin/stats"] }), // Bulletin board stats
                ]);

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
        const isClearing = clearingEvents.includes(row.api_id);
        const isSynced = row.lastAttendanceSync !== null;

        if (isClearing) {
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Clearing...
            </Badge>
          );
        }

        if (isSyncing) {
          return (
            <div className="space-y-2 w-[300px]">
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </Badge>
              {syncProgress && (
                <>
                  <Progress value={syncProgress.progress} className="h-2" />
                  <div className="h-[48px] flex flex-col justify-center">
                    <div className="h-[20px] flex items-center">
                      {syncProgress.data && (
                        <p className="text-xs text-muted-foreground">
                          Processed: {syncProgress.data.total} (Success: {syncProgress.data.success}, Failed: {syncProgress.data.failure})
                        </p>
                      )}
                    </div>
                    <div className="h-[20px] flex items-center">
                      <p className="text-xs text-muted-foreground truncate">
                        {syncProgress.message}
                      </p>
                    </div>
                  </div>
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

  const handleClearAttendance = async (event: EventWithSync) => {
    try {
      setClearingEvents(prev => [...prev, event.api_id]);

      // Optimistically update UI
      if (selectedEvent && selectedEvent.api_id === event.api_id) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          isSynced: false,
          lastAttendanceSync: null,
          attendeeCount: 0
        } : null);
      }

      // Optimistically update the events list
      queryClient.setQueryData(["/api/admin/events", currentPage, itemsPerPage, debouncedSearch],
        (oldData: EventsResponse | undefined) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            events: oldData.events.map(e =>
              e.api_id === event.api_id ? {
                ...e,
                isSynced: false,
                lastAttendanceSync: null,
                attendeeCount: 0
              } : e
            )
          };
        }
      );

      // Also optimistically update the attendees list
      queryClient.setQueryData([`/api/admin/events/${event.api_id}/attendees`],
        () => ({ attendees: [], total: 0 })
      );

      const response = await fetch(`/api/admin/events/${event.api_id}/attendance`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear attendance');
      }

      // Invalidate all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendees`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/attendees`] }), // Public attendees
        queryClient.invalidateQueries({ queryKey: [`/api/admin/events/${event.api_id}/attendance`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/events"] }), // Public events list
        queryClient.invalidateQueries({ queryKey: ["/api/events/featured"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.api_id}/stats`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/stats"] }), // Public stats
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }), // Admin dashboard stats
        queryClient.invalidateQueries({ queryKey: ["/api/bulletin/stats"] }), // Bulletin board stats
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

      // Revert optimistic updates on error
      if (selectedEvent && selectedEvent.api_id === event.api_id) {
        const currentEvent = await queryClient.fetchQuery({
          queryKey: [`/api/admin/events/${event.api_id}`],
        });
        setSelectedEvent(currentEvent);
      }

      // Revert the attendees list
      await queryClient.invalidateQueries({
        queryKey: [`/api/admin/events/${event.api_id}/attendees`]
      });
    } finally {
      setClearingEvents(prev => prev.filter(id => id !== event.api_id));
    }
  };

  const actions = [
    {
      label: (event: EventWithSync) => event.lastAttendanceSync ? "Re-sync attendees" : "Sync attendees",
      onClick: (event: EventWithSync) => {
        handleStartSync(event.api_id);
      },
    },
    {
      label: "View details",
      onClick: (event: EventWithSync) => {
        setSelectedEvent(event);
      },
    },
    {
      label: "Clear attendance",
      onClick: (event: EventWithSync) => {
        handleClearAttendance(event);
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

  const handleNavigate = (event: EventWithSync) => {
    setSelectedEvent(event);
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
            events={events}
            onNavigate={handleNavigate}
            onSync={handleStartSync}
            onStartSync={handleStartSync}
          />
        )}
      </PreviewSidebar>
    </div>
  );
}