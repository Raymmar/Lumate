import DashboardLayout from "@/components/layout/DashboardLayout";
import EventList from "@/components/events/EventList";
import PeopleDirectory from "@/components/people/PeopleDirectory";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="flex">
        <aside className="w-[350px] min-w-[350px] border-r bg-muted/10 flex flex-col fixed h-[calc(100vh-73px)] left-0">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col">
            <div className="flex-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Next event</h2>
                <a href="/calendar" className="text-xs text-muted-foreground hover:text-primary">
                  View full calendar
                </a>
              </div>
              <EventList />
            </div>
            <div className="flex-1 overflow-y-auto">
              <PeopleDirectory />
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 ml-[350px] min-h-[calc(100vh-73px)] overflow-y-auto">
          <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
            <p className="text-muted-foreground">Content area</p>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}