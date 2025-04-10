import { AdminLayout } from "@/components/layout/AdminLayout";
import { CompaniesTable } from "@/components/admin/CompaniesTable";

export default function AdminCompaniesPage() {
  return (
    <AdminLayout title="Companies">
      <CompaniesTable />
    </AdminLayout>
  );
}