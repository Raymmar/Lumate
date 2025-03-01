import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UserPlus, CreditCard, RefreshCcw } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading,
  description
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  isLoading: boolean;
  description?: string;
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
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
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

  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleResetAndSync = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/_internal/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reset and sync data');
      }

      toast({
        title: "Success",
        description: "Data has been reset and synced successfully.",
      });

      // Reload the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset and sync data",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <PageContainer>
            <NavBar />
          </PageContainer>
        </div>

        {/* Content area with sidebar and main content */}
        <PageContainer className="flex-1 pt-16">
          <div className="flex w-full">
            {/* Sidebar with AdminTabs */}
            <div className="w-64 min-h-[calc(100vh-4rem)] bg-muted/10 border-r">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold">Admin Panel</h2>
                <AdminTabs />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                <Button
                  variant="default"
                  className="bg-black hover:bg-black/90"
                  onClick={handleResetAndSync}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reset & Sync Data
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                <StatCard
                  title="Total Events"
                  value={statsData?.events || 0}
                  icon={Calendar}
                  isLoading={isLoading}
                />
                <StatCard
                  title="Unique Attendees"
                  value={statsData?.uniqueAttendees || 0}
                  icon={Users}
                  isLoading={isLoading}
                  description="Individual people who have attended events"
                />
                <StatCard
                  title="Total Attendees"
                  value={statsData?.totalAttendees || 0}
                  icon={Users}
                  isLoading={isLoading}
                  description="Total event attendance count"
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
        </PageContainer>
      </div>
    </AdminGuard>
  );
}