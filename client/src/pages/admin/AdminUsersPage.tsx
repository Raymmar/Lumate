import { AdminLayout } from "@/components/layout/AdminLayout";
import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <AdminLayout title="Users">
      <UsersTable />
    </AdminLayout>
  );
}