import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        {/* Content area with sidebar and main content */}
        <PageContainer className="flex-1 pt-16">
          <div className="flex w-full">
            {/* Sidebar with AdminTabs */}
            <div className="w-64 min-h-[calc(100vh-4rem)] bg-muted/10 border-r">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6">
              <h1 className="text-2xl font-bold mb-6">Users</h1>
              <UsersTable />
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}
