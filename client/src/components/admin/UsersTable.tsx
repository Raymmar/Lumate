import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  created_at: string;
  isAdmin: boolean;
}

export function UsersTable() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error("Failed to toggle admin status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
    {
      key: "isAdmin",
      header: "Admin",
      cell: (row: User) => (
        <Switch
          checked={row.isAdmin}
          onCheckedChange={() => toggleAdminMutation.mutate(row.id)}
          disabled={toggleAdminMutation.isPending}
        />
      ),
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (user: User) => {
        // Placeholder for view action
        console.log("View user:", user);
      },
    },
    {
      label: "Edit",
      onClick: (user: User) => {
        // Placeholder for edit action
        console.log("Edit user:", user);
      },
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <DataTable data={users} columns={columns} actions={actions} />;
}