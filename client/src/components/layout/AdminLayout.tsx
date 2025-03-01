import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: ReactNode;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <NavBar />
        <PageContainer>
          <div className="flex">
            {/* Fixed Sidebar */}
            <div className="w-64 fixed left-0 top-14 bottom-0 bg-background border-r z-40 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex-1 pl-64">
              <div className="p-4">
                <div className="mb-4">{title}</div>
                {children}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}