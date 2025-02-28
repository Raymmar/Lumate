import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { User } from "@shared/schema";

export function MembersTable() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
    queryFn: async () => {
      const response = await fetch("/api/admin/members");
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
      key: "isVerified",
      header: "Status",
      cell: (row: User) => row.isVerified ? "Verified" : "Pending",
    },
    {
      key: "createdAt",
      header: "Joined",
      cell: (row: User) => format(new Date(row.createdAt), "PPP"),
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