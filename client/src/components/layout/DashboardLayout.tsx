import { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import EventList from "@/components/events/EventList";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "./PageContainer";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen bg-muted/10">
        {/* Fixed header with full-width background */}
        <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <PageContainer>
            <div className="flex h-14 items-center gap-4">
              <SidebarTrigger className="flex-none" />
              <NavBar className="flex-1" />
            </div>
          </PageContainer>
        </div>

        <PageContainer>
          <div className="flex relative">
            {/* Sidebar */}
            <Sidebar 
              variant="sidebar" 
              collapsible="offcanvas"
              style={{
                "--sidebar-width": "400px",
              } as React.CSSProperties}
            >
              <SidebarContent>
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
              </SidebarContent>
            </Sidebar>

            {/* Main content area */}
            <SidebarInset>
              <div className="p-4">
                {children}
              </div>
            </SidebarInset>
          </div>
        </PageContainer>
      </div>
    </SidebarProvider>
  );
}