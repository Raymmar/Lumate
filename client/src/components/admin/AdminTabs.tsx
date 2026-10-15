import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import AdminMenu from "@/components/AdminMenu";

type AdminTab = { id: string; label: string; path: string };

const ADMIN_TABS: AdminTab[] = [
  { id: "overview", label: "Dashboard", path: "/admin" },
  { id: "members", label: "Members", path: "/admin/members" },
  { id: "events", label: "Events", path: "/admin/events" },
  { id: "posts", label: "Posts", path: "/admin/posts" },
  { id: "coupons", label: "Coupons", path: "/admin/coupons" },
  { id: "people", label: "People", path: "/admin/people" },
  { id: "companies", label: "Companies", path: "/admin/companies" },
  { id: "sponsors", label: "Sponsors", path: "/admin/sponsors" },
  { id: "industries", label: "Industries", path: "/admin/industries" },
  { id: "badges", label: "Badges", path: "/admin/badges" },
  { id: "roles", label: "Roles & Permissions", path: "/admin/roles" },
];

const SUMMIT_TABS: AdminTab[] = [
  { id: "summits", label: "Summits", path: "/admin/summits" },
  { id: "agenda", label: "Agenda", path: "/admin/agenda" },
  { id: "speakers", label: "Speakers", path: "/admin/speakers" },
];

function TabLinks({ tabs }: { tabs: AdminTab[] }) {
  return (
    <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-2">
      {tabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id} className="w-full justify-start px-4 py-2" asChild>
          <Link href={tab.path}>{tab.label}</Link>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export function AdminTabs() {
  const [location] = useLocation();
  const currentTab = [...ADMIN_TABS, ...SUMMIT_TABS].find(tab => tab.path === location)?.id || "overview";

  return (
    <div className="flex flex-col h-full">
      <Tabs value={currentTab} className="w-full" orientation="vertical">
        <TabLinks tabs={ADMIN_TABS} />
        <div className="mt-4 pt-4 border-t" data-testid="admin-nav-summit-group">
          <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summit</p>
          <TabLinks tabs={SUMMIT_TABS} />
        </div>
      </Tabs>

      {/* Admin Menu with Reset & Sync button at the bottom */}
      <div className="mt-auto pt-4">
        <AdminMenu />
      </div>
    </div>
  );
}
