import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UserPlus, CreditCard } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import AdminMenu from "@/components/AdminMenu";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? "..." : value}
        </div>
      </CardContent>
    </Card>
  );
}

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-[1440px] mx-auto">
            <NavBar />
          </div>
        </div>

        <div className="flex pt-16">
          {/* Sidebar */}
          <div className="w-64 min-h-[calc(100vh-4rem)] bg-muted/10 border-r p-4 flex flex-col">
            <div className="flex-1">
              <h2 className="font-semibold mb-4">Admin Panel</h2>
              <nav className="space-y-2">
                <a href="#" className="block p-2 hover:bg-muted rounded-md">
                  Dashboard
                </a>
                <a href="#" className="block p-2 hover:bg-muted rounded-md">
                  Users
                </a>
                <a href="#" className="block p-2 hover:bg-muted rounded-md">
                  Events
                </a>
                <a href="#" className="block p-2 hover:bg-muted rounded-md">
                  Settings
                </a>
              </nav>
            </div>
            {/* AdminMenu fixed to bottom */}
            <div className="border-t pt-4">
              <AdminMenu />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Total Events"
                value={statsData?.events || 0}
                icon={Calendar}
                isLoading={isLoading}
              />
              <StatCard
                title="Total Attendees"
                value={statsData?.people || 0}
                icon={Users}
                isLoading={isLoading}
              />
              <StatCard
                title="Registered Users"
                value={statsData?.users || 0}
                icon={UserPlus}
                isLoading={isLoading}
              />
              <StatCard
                title="Paid Users"
                value={statsData?.paidUsers || 0}
                icon={CreditCard}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}