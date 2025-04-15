import { AdminLayout } from "@/components/layout/AdminLayout";
import IndustriesTable from "@/components/admin/IndustriesTable";

export default function IndustriesPage() {
  return (
    <AdminLayout>
      <IndustriesTable />
    </AdminLayout>
  );
}