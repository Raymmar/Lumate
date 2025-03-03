import { useQuery } from "@tanstack/react-query";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface EventWithSync extends Event {
  isSynced: boolean;
  lastSyncedAt: string | null;
  lastAttendanceSync: string | null;
}

interface EventsResponse {
  events: EventWithSync[];
  total: number;
}

export function EventsTable() {
  const [selectedEvent, setSelectedEvent] = useState<EventWithSync | null>(null);
  const [syncingEvents, setSyncingEvents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300); // Reduced debounce time
  const itemsPerPage = 100;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/events", currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/events?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      return data as EventsResponse;
    },
    keepPreviousData: true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const events = data?.events || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleStartSync = (eventId: string) => {
    setSyncingEvents(prev => [...prev, eventId]);
  };

  const handleSync = (eventId: string) => {
    setSyncingEvents(prev => prev.filter(id => id !== eventId));
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

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search events..."
          isLoading={isFetching}
        />
      </div>

      <div className="min-h-[400px] relative">
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
            onSync={handleSync}
            onStartSync={handleStartSync}
          />
        )}
      </PreviewSidebar>
    </div>
  );
}