import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Navbar with background extending full width */}
        <div className="w-full bg-background sticky top-0 z-50">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        <PageContainer>
          <div className="flex relative">
            {/* Sidebar */}
            <div className="w-64 sticky top-[57px] h-[calc(100vh-57px)] bg-background border-r overflow-y-auto">
              <div className="p-4">
                <AdminTabs />
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-[calc(100vh-57px)]">
              <div className="p-4">
                {children}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}