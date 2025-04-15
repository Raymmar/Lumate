import { AdminLayout } from "@/components/layout/AdminLayout";
import IndustriesTable from "@/components/admin/IndustriesTable";

export default function IndustriesPage() {
  return (
    <AdminLayout title={<h1 className="text-2xl font-bold">Industries Management</h1>}>
      <IndustriesTable />
    </AdminLayout>
  );
}