import { AdminGuard } from "@/components/AdminGuard";
import IndustriesTable from "@/components/admin/IndustriesTable";

export default function IndustriesPage() {
  return (
    <AdminGuard>
      <div className="container py-10">
        <IndustriesTable />
      </div>
    </AdminGuard>
  );
}