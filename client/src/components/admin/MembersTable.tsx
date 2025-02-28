import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  created_at: string;
}

export function MembersTable() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  const columns = [
    {
      key: "email",
      header: "Email",
      cell: (row: User) => row.email,
    },
    {
      key: "displayName",
      header: "Display Name",
      cell: (row: User) => row.displayName || "—",
    },
    {
      key: "created_at",
      header: "Created At",
      cell: (row: User) => format(new Date(row.created_at), "PPP"),
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (user: User) => {
        // Placeholder for view action
        console.log("View member:", user);
      },
    },
    {
      label: "Edit",
      onClick: (user: User) => {
        // Placeholder for edit action
        console.log("Edit member:", user);
      },
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <DataTable data={users} columns={columns} actions={actions} />;
}
