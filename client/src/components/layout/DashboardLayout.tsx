import { ReactNode, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import EventList from "@/components/events/EventList";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "./PageContainer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex-none">
          <EventList />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <PeopleDirectory />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/10">
      {/* Fixed header with full-width background */}
      <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
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

      <PageContainer>
        <div className="flex">
          {/* Sidebar - hidden on mobile, visible on md and up */}
          <aside className="hidden md:block sticky top-[57px] h-[calc(100vh-57px)] w-[280px] lg:w-[350px] border-r bg-background flex flex-col">
            <SidebarContent />
          </aside>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto bg-muted/10">
            {/* Mobile Events List - only visible when sidebar is hidden */}
            <div className="md:hidden">
              <div className="bg-background border-b p-4">
                <EventList compact />
              </div>
            </div>
            <div className="p-4 min-h-[calc(100vh-57px)]">
              {children}
            </div>
          </main>
        </div>
      </PageContainer>
    </div>
  );
}