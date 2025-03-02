import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";

const ADMIN_TABS = [
  { id: "overview", label: "Dashboard", path: "/admin" },
  { id: "posts", label: "Posts", path: "/admin/posts" },
  { id: "media", label: "Media Library", path: "/admin/media" },
  { id: "members", label: "Members", path: "/admin/members" },
  { id: "events", label: "Events", path: "/admin/events" },
  { id: "people", label: "People", path: "/admin/people" },
] as const;

export function AdminTabs() {
  const [location] = useLocation();
  const currentTab = ADMIN_TABS.find(tab => tab.path === location)?.id || "overview";

  return (
    <Tabs value={currentTab} className="w-full" orientation="vertical">
      <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-2">
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
  );
}