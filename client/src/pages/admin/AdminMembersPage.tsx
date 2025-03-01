import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { MembersTable } from "@/components/admin/MembersTable";

export default function AdminMembersPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        {/* Fixed Sidebar */}
        <div className="fixed top-16 left-0 bottom-0 w-64 bg-muted/10 border-r z-40 overflow-y-auto">
          <div className="p-4 space-y-4">
            <h2 className="font-semibold">Admin Panel</h2>
            <AdminTabs />
          </div>
        </div>

        {/* Main content area with independent scroll */}
        <div className="pl-64 pt-16">
          <div className="min-h-screen overflow-auto">
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-6">Members</h1>
              <MembersTable />
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}