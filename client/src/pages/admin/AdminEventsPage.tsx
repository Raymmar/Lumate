import { AdminLayout } from "@/components/layout/AdminLayout";
import { EventsTable } from "@/components/admin/EventsTable";

export default function AdminEventsPage() {
  return (
    <AdminLayout>
      <EventsTable />
    </AdminLayout>
  );
}