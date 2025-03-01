import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EventsTable } from "@/components/admin/EventsTable";

export default function AdminEventsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        <PageContainer>
          <div className="flex pt-16">
            {/* Fixed Sidebar */}
            <div className="w-64 fixed top-16 bottom-0 bg-muted/10 border-r z-40 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex-1 pl-64">
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">Events</h1>
                <EventsTable />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}