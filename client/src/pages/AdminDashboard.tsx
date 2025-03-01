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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SyncModal } from "@/components/admin/SyncModal";

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

  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleStartSync = () => {
    setIsSyncing(true);
  };

  const handleSyncComplete = () => {
    setIsSyncing(false);
    // Reload the page to show updated data after sync completes
    window.location.reload();
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
                  onClick={handleStartSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
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
        </PageContainer>
      </div>

      {/* Sync Modal */}
      <Sheet open={isSyncing} onOpenChange={(open) => !open && setIsSyncing(false)}>
        <SheetContent>
          <SyncModal isOpen={isSyncing} onComplete={handleSyncComplete} />
        </SheetContent>
      </Sheet>
    </AdminGuard>
  );
}