import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserPlus, CreditCard, DollarSign, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch admin stats");
      }
      return response.json();
    }
  });

  return (
    <AdminLayout title="Dashboard Overview">
      <div>
        <div className="flex justify-end mb-6">
          <Button
            variant="default"
            className="bg-black hover:bg-black/90"
            onClick={() => window.open('https://lu.ma/calendar/manage/cal-piKozq5UuB2gziq', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Calendar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Events"
            value={statsData?.events || 0}
            icon={Calendar}
            isLoading={isLoading}
            description="Total number of events hosted"
          />
          <StatCard
            title="Total Attendees"
            value={statsData?.totalAttendees || 0}
            icon={Users}
            isLoading={isLoading}
            description="Total event attendance count"
          />
          <StatCard
            title="Unique Attendees"
            value={statsData?.uniqueAttendees || 0}
            icon={Users}
            isLoading={isLoading}
            description="Individual event attendees"
          />
          <StatCard
            title="Registered Members"
            value={statsData?.users || 0}
            icon={UserPlus}
            isLoading={isLoading}
            description="Total number of registered members"
          />
          <StatCard
            title="Paid Members"
            value={statsData?.paidUsers || 0}
            icon={CreditCard}
            isLoading={isLoading}
            description="Members with active paid subscriptions"
          />
          <StatCard
            title="Membership Revenue"
            value="$0.00"
            icon={DollarSign}
            isLoading={isLoading}
            description="Total revenue from memberships"
          />
        </div>
      </div>
    </AdminLayout>
  );
}