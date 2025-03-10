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
    <div className="flex-1 overflow-hidden flex flex-col h-full">
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Fixed header */}
      <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <PageContainer>
          <div className="flex items-center justify-between w-full">
            <div className="flex-1">
              <NavBar />
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex">
        <PageContainer>
          <div className="flex flex-1">
            {/* Sidebar - hidden below lg, visible on lg and up */}
            <aside className="hidden lg:block w-[350px] border-r">
              <SidebarContent />
            </aside>

            {/* Main content area */}
            <main className="flex-1 bg-muted/10">
              {/* Mobile Events List - only visible when sidebar is hidden */}
              <div className="lg:hidden">
                <div className="bg-background p-4">
                  <EventList compact />
                </div>
              </div>
              <div className="p-4">
                {children}
              </div>
            </main>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}