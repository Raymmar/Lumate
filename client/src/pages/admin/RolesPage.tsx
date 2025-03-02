import { AdminLayout } from "@/components/layout/AdminLayout";
import { RolesAndPermissions } from "@/components/admin/RolesAndPermissions";

export default function RolesPage() {
  return (
    <AdminLayout title="Roles & Permissions">
      <RolesAndPermissions />
    </AdminLayout>
  );
}
