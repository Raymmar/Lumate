import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: ReactNode;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  const SidebarContent = () => (
    <div className="p-4">
      <AdminTabs />
    </div>
  );

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Navbar with background extending full width */}
        <div className="w-full sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="border-b">
            <div className="max-w-[1440px] mx-auto">
              <PageContainer>
                <div className="flex items-center">
                  <NavBar />
                  <div className="md:hidden ml-2">
                    <Drawer open={isOpen} onOpenChange={setIsOpen}>
                      <DrawerTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
                          <SidebarContent />
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
                </div>
              </PageContainer>
            </div>
          </div>
        </div>

        <PageContainer>
          <div className="flex relative">
            {/* Sidebar - hidden on mobile, visible on md and up */}
            <div className="hidden md:block w-64 sticky top-[57px] h-[calc(100vh-57px)] bg-background border-r overflow-y-auto">
              <SidebarContent />
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-[calc(100vh-57px)]">
              <div className="p-4">
                {title && <div className="mb-4">{title}</div>}
                {children}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}