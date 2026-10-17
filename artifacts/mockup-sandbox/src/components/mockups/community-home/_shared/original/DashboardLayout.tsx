import { ReactNode } from "react";
import { EventList, PeopleDirectory } from "./HomeSections";
import { NavBar } from "./NavBar";
import { OriginalTicket } from "./SummitTicketOffer";
import contentSource from "../content.json?raw";

const content = JSON.parse(contentSource) as Record<string, any>;

interface DashboardLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
  aboveLayout?: ReactNode;
}

function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-6 ${className}`}>{children}</div>;
}

function currentSummit() {
  const summit = content.summit || {};
  return {
    title: summit.title || "Sarasota Tech Summit",
    year: summit.year || 2027,
    dateLabel: summit.dateLabel,
    startDate: summit.startDate,
    endDate: summit.endDate,
    venueName: summit.venueName,
    venueAddress: summit.venueAddress,
  };
}

export default function DashboardLayout({ children, hideSidebar = false, aboveLayout }: DashboardLayoutProps) {
  const showTicket = true;
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-57px)]">
      <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        {/* Show EventList in desktop sidebar, hide in mobile sidebar since it's shown in main content */}
        {!isMobile && (
          <div className="flex-none">
            <EventList content={content} />
          </div>
        )}
        <div className="flex-1 overflow-hidden min-h-0">
          <PeopleDirectory content={content} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative community-home" style={{ outline: "none" }}>
      {/* Fixed header nav with full-width background */}
      <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="w-full">
          <PageContainer>
            <div className="flex items-center justify-between w-full border-b">
              <div className="flex-1">
                <NavBar content={content} />
              </div>
            </div>
          </PageContainer>
        </div>
      </div>

      <PageContainer>
        {aboveLayout ?? (showTicket ? (
          <div className="px-2 sm:px-4">
            <OriginalTicket summit={currentSummit()} price="$250" interval="year" />
          </div>
        ) : null)}
        <div className="flex">
          {!hideSidebar && (
            <aside className="hidden lg:block sticky top-[57px] h-[calc(100vh-57px)] w-[350px] border-r bg-background">
              <SidebarContent />
            </aside>
          )}

          <main className="flex-1 overflow-y-auto">
            {!hideSidebar && (
              <div className="lg:hidden">
                <div className="bg-background p-2 sm:p-4">
                  <EventList content={content} compact />
                </div>
              </div>
            )}
            <div className="p-2 sm:p-4 min-h-[calc(100vh-57px)]">
              {children}
            </div>
          </main>
        </div>
      </PageContainer>
    </div>
  );
}
