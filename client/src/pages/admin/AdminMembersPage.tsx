import { AdminGuard } from "@/components/AdminGuard";
import { MembersTable } from "@/components/admin/MembersTable";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function AdminMembersPage() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-4">
          <MembersTable />
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
