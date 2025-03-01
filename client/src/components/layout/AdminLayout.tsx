import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <NavBar />

        <PageContainer>
          <div className="flex pt-16">
            {/* Fixed Sidebar */}
            <div className="w-64 fixed top-16 bottom-0 bg-background border-r z-40 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex-1 pl-64">
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">{title}</h1>
                {children}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}