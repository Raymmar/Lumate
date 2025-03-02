import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { SearchInput } from "./SearchInput";
import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface User {
  id: string;
  email: string;
  displayName: string | null;
  created_at: string;
  isAdmin: boolean;
}

export function UsersTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500); // Add 500ms debounce

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users", debouncedSearch],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`);
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
        console.log("View user:", user);
      },
    },
    {
      label: "Edit",
      onClick: (user: User) => {
        console.log("Edit user:", user);
      },
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search users..."
        />
      </div>
      <DataTable data={users} columns={columns} actions={actions} />
    </div>
  );
}