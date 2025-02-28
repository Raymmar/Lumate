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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1440px] mx-auto">
          <NavBar />
        </div>
      </div>

      {/* Content area below header */}
      <div className="flex pt-16 max-w-[1440px] mx-auto w-full relative"> {/* Added max-width and centering */}
        {/* Fixed sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-[350px] border-r bg-muted/10 flex flex-col z-40">
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
        <main className="flex-1 ml-[350px] overflow-y-auto">
          <div className="p-6 min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}