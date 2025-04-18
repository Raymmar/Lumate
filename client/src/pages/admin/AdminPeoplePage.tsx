import { AdminLayout } from "@/components/layout/AdminLayout";
import { PeopleTable } from "@/components/admin/PeopleTable";

export default function AdminPeoplePage() {
  return (
    <AdminLayout>
      <PeopleTable />
    </AdminLayout>
  );
}