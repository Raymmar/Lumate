import DashboardLayout from "@/components/layout/DashboardLayout";
import EventList from "@/components/events/EventList";
import PeopleDirectory from "@/components/people/PeopleDirectory";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-73px)]">
        <aside className="w-[350px] min-w-[350px] border-r bg-muted/10 flex flex-col">
          <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex-none">
              <EventList />
            </div>
            <div className="h-px bg-border my-4" />
            <div className="flex-1 overflow-hidden">
              <PeopleDirectory />
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6">
          {/* Right side content area for future use */}
          <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
            <p className="text-muted-foreground">Content area</p>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}