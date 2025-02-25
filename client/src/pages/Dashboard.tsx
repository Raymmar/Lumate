import DashboardLayout from "@/components/layout/DashboardLayout";
import EventList from "@/components/events/EventList";
import PeopleDirectory from "@/components/people/PeopleDirectory";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <EventList />
        <PeopleDirectory />
      </div>
    </DashboardLayout>
  );
}
