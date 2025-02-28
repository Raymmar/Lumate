import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UserPlus } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";

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
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-muted/10 border-r p-4">
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

        {/* Main content */}
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
          
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Events"
              value={statsData?.events || 0}
              icon={Calendar}
              isLoading={isLoading}
            />
            <StatCard
              title="Total People"
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
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
