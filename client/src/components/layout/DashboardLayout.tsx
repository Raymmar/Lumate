import { ReactNode } from "react";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import EventList from "@/components/events/EventList";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "./PageContainer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-57px)]">
      <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        {/* Show EventList in desktop sidebar, hide in mobile sidebar since it's shown in main content */}
        {!isMobile && (
          <div className="flex-none">
            <EventList />
          </div>
        )}
        <div className="flex-1 overflow-hidden min-h-0">
          <PeopleDirectory />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/10">
      {/* Fixed header nav with full-width background */}
      <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="w-full">
          <PageContainer>
            <div className="flex items-center justify-between w-full border-b">
              <div className="flex-1">
                <NavBar />
              </div>
            </div>
          </PageContainer>
        </div>
      </div>

      <PageContainer>
        <div className="flex">
          {/* Sidebar - hidden below lg, visible on lg and up */}
          <aside className="hidden lg:block sticky top-[57px] h-[calc(100vh-57px)] w-[350px] border-r bg-background">
            <SidebarContent />
          </aside>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto bg-muted/10">
            {/* Mobile Events List - only visible when sidebar is hidden */}
            <div className="lg:hidden">
              <div className="bg-background p-4">
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