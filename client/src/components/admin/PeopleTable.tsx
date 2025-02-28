import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Person } from "@shared/schema";

export function PeopleTable() {
  const { data: people = [], isLoading } = useQuery<Person[]>({
    queryKey: ["/api/admin/people"],
    queryFn: async () => {
      const response = await fetch("/api/admin/people");
      if (!response.ok) throw new Error("Failed to fetch people");
      return response.json();
    },
  });

  const columns = [
    {
      key: "userName",
      header: "Name",
      cell: (row: Person) => row.userName || row.fullName || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Person) => row.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (row: Person) => row.role || "—",
    },
    {
      key: "organizationName",
      header: "Organization",
      cell: (row: Person) => row.organizationName || "—",
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