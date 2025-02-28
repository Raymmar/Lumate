import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";

interface Person {
  id: string;
  name: string;
  email: string;
  created_at: string;
  last_seen_at: string | null;
}

export function PeopleTable() {
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["/api/admin/people"],
    queryFn: async () => {
      const response = await fetch("/api/admin/people");
      if (!response.ok) throw new Error("Failed to fetch people");
      return response.json();
    },
  });

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: Person) => row.name,
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Person) => row.email,
    },
    {
      key: "created_at",
      header: "Created At",
      cell: (row: Person) => format(new Date(row.created_at), "PPP"),
    },
    {
      key: "last_seen_at",
      header: "Last Seen",
      cell: (row: Person) => row.last_seen_at ? format(new Date(row.last_seen_at), "PPP") : "Never",
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (person: Person) => {
        // Placeholder for view action
        console.log("View person:", person);
      },
    },
    {
      label: "Edit",
      onClick: (person: Person) => {
        // Placeholder for edit action
        console.log("Edit person:", person);
      },
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <DataTable data={people} columns={columns} actions={actions} />;
}
