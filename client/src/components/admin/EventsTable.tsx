import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Event } from "@shared/schema";

export function EventsTable() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

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
      key: "endTime",
      header: "End Date",
      cell: (row: Event) => format(new Date(row.endTime), "PPP"),
    },
    {
      key: "url",
      header: "URL",
      cell: (row: Event) => row.url || "—",
    },
  ];

  const actions = [
    {
      label: "View Details",
      onClick: (event: Event) => {
        // Placeholder for view action
        console.log("View event:", event);
      },
    },
    {
      label: "Edit",
      onClick: (event: Event) => {
        // Placeholder for edit action
        console.log("Edit event:", event);
      },
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <DataTable data={events} columns={columns} actions={actions} />;
}