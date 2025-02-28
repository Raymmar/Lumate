import { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import EventList from "@/components/events/EventList";
import { NavBar } from "@/components/NavBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="flex-none">
        <NavBar />
      </div>

      {/* Content area below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed sidebar */}
        <aside className="w-[350px] border-r bg-muted/10 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex-none">
              <EventList />
            </div>
            <div className="flex-1 overflow-auto">
              <PeopleDirectory />
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}