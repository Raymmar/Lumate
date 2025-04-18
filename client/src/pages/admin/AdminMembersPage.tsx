import { AdminLayout } from "@/components/layout/AdminLayout";
import { MembersTable } from "@/components/admin/MembersTable";

export default function AdminMembersPage() {
  return (
    <AdminLayout>
      <MembersTable />
    </AdminLayout>
  );
}