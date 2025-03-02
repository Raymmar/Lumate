import { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import EventList from "@/components/events/EventList";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "./PageContainer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/10">
      {/* Fixed header with full-width background */}
      <div className="sticky top-0 w-full bg-background border-b z-50">
        <PageContainer>
          <NavBar />
        </PageContainer>
      </div>

      <PageContainer>
        <div className="flex pt-4">
          {/* Sidebar */}
          <aside className="sticky top-[57px] h-[calc(100vh-57px)] w-[350px] border-r bg-background flex flex-col">
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
          </aside>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto bg-muted/10">
            <div className="p-6 min-h-[calc(100vh-57px)]">
              {children}
            </div>
          </main>
        </div>
      </PageContainer>
    </div>
  );
}