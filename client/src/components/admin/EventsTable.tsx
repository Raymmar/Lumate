import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  attendee_count: number;
}

export function EventsTable() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/admin/events"],
    queryFn: async () => {
      const response = await fetch("/api/admin/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const columns = [
    {
      key: "name",
      header: "Event Name",
      cell: (row: Event) => row.name,
    },
    {
      key: "start_at",
      header: "Start Date",
      cell: (row: Event) => format(new Date(row.start_at), "PPP"),
    },
    {
      key: "end_at",
      header: "End Date",
      cell: (row: Event) => format(new Date(row.end_at), "PPP"),
    },
    {
      key: "attendee_count",
      header: "Attendees",
      cell: (row: Event) => row.attendee_count,
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
