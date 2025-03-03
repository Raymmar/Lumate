import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import AdminMenu from "@/components/AdminMenu";

const ADMIN_TABS = [
  { id: "overview", label: "Dashboard", path: "/admin" },
  { id: "members", label: "Members", path: "/admin/members" },
  { id: "events", label: "Events", path: "/admin/events" },
  { id: "people", label: "People", path: "/admin/people" },
  { id: "roles", label: "Roles & Permissions", path: "/admin/roles" },
] as const;

export function AdminTabs() {
  const [location] = useLocation();
  const currentTab = ADMIN_TABS.find(tab => tab.path === location)?.id || "overview";

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation Section - Scrollable if needed */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={currentTab} className="w-full" orientation="vertical">
          <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-2 p-2">
            {ADMIN_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="w-full justify-start px-4 py-2"
                asChild
              >
                <Link href={tab.path}>
                  {tab.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Reset & Sync Button fixed at the bottom */}
      <div className="w-full bg-background p-4">
        <AdminMenu />
      </div>
    </div>
  );
}