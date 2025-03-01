import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserPlus, CreditCard, DollarSign, ExternalLink } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
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
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        <PageContainer>
          <div className="flex pt-16">
            {/* Fixed Sidebar */}
            <div className="w-64 fixed top-16 bottom-0 bg-muted/10 border-r z-40 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content area with independent scroll */}
            <div className="flex-1 pl-64">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Dashboard Overview</h1>
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
                    description="Individual people who have attended events"
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
            </div>
          </div>
        </PageContainer>
      </div>
    </AdminGuard>
  );
}