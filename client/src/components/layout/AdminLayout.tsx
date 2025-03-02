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
          <div className="relative flex min-h-[calc(100vh-3.5rem)] mt-14">
            {/* Fixed width sidebar */}
            <div className="w-64 shrink-0 bg-background border-r">
              <div className="p-4 space-y-4">
                <AdminTabs />
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-w-0">
              <div className="p-6">
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