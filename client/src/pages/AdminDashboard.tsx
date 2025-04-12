import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserPlus, CreditCard, DollarSign, ExternalLink, Tickets, Coins, Building, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { useState, useEffect } from "react";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import { Plus } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface RevenueData {
  totalRevenue: number;
  revenueByPrice: {
    id: string;
    nickname?: string;
    productName?: string;
    productId?: string;
    revenue: number;
    subscriptionCount: number;
    unitAmount?: number;
  }[];
}

export default function AdminDashboard() {
  const [_, navigate] = useLocation();
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
  
  const { data: revenueData, isLoading: isRevenueLoading, refetch: refetchRevenue } = useQuery<RevenueData>({
    queryKey: ["/api/stripe/revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }
      return response.json();
    },
    retry: 1, // Limit retries in case of failure
    enabled: true // Always enabled so we get data on page load
  });

  // Posts management state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  
  // Navigation functions
  const handleNewMember = () => {
    navigate("/admin/members?action=new");
  };
  
  const handleNewCompany = () => {
    navigate("/admin/companies?action=new");
  };

  // Fetch all posts for navigation
  const { data: postsData } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/admin/posts"]
  });

  const handleCreatePost = async (data: InsertPost & { tags?: string[] }) => {
    try {
      await apiRequest('/api/admin/posts', 'POST', data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout title={
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Community Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('https://lu.ma/calendar/manage/cal-piKozq5UuJw79D', '_blank')}
            className="text-sm"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Calendar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewMember}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewCompany}
          >
            <Building className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>
    }>
      {/* Stats Grid - Two columns on mobile */}
      <div className="grid gap-3 grid-cols-2 mb-6">
        <StatCard
          title="Events"
          value={statsData?.events || 0}
          icon={Calendar}
          isLoading={isLoading}
          description="Since August 2023"
        />
        <StatCard
          title="Tickets"
          value={statsData?.totalAttendees || 0}
          icon={Tickets}
          isLoading={isLoading}
          description="Total event attendance"
        />
        <StatCard
          title="Subscribers"
          value={statsData?.uniqueAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="63% open rate 21% click rate"
        />
        <StatCard
          title="Claimed Accounts"
          value={statsData?.users || 0}
          icon={UserPlus}
          isLoading={isLoading}
          description="Total number of registered members"
        />
        <StatCard
          title="Paid Members"
          value={statsData?.paidUsers || 0}
          icon={Coins}
          isLoading={isLoading}
          description="Members with active paid subscriptions"
        />
        <StatCard
          title="Membership Revenue"
          value={revenueData?.totalRevenue ? `$${revenueData.totalRevenue.toFixed(2)}` : '--'}
          icon={DollarSign}
          isLoading={isLoading || isRevenueLoading}
          description={
            revenueData?.revenueByPrice && revenueData.revenueByPrice.length > 0 
              ? `${revenueData.revenueByPrice.length} subscription types active`
              : "Total revenue from memberships"
          }
        />
      </div>

      {/* Revenue Breakdown Section */}
      {revenueData?.revenueByPrice && revenueData.revenueByPrice.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Membership Revenue Breakdown</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchRevenue()}
              className="flex items-center gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Subscription</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Active Subscriptions</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Product ID</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.revenueByPrice.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">
                      {item.nickname || item.productName || 'Unknown Subscription'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      ${item.unitAmount ? item.unitAmount.toFixed(2) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.subscriptionCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      ${item.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[150px]" title={item.productId}>
                      {item.productId}
                      {item.productId === 'prod_RXzIPHBkm0MCM7' && <span className="ml-1 text-green-500">✓</span>}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/20">
                  <td className="px-4 py-3 font-medium">Total</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-medium">
                    {revenueData.revenueByPrice.reduce((sum, item) => sum + item.subscriptionCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    ${revenueData.totalRevenue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Posts Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Posts</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <PostsTable onSelect={setSelectedPost} />
          </div>
        </div>
        {(selectedPost || isCreating) && (
          <PostPreview
            post={selectedPost || undefined}
            isNew={isCreating}
            onClose={() => {
              setSelectedPost(null);
              setIsCreating(false);
            }}
            onSave={handleCreatePost}
            posts={postsData?.posts || []}
            onNavigate={setSelectedPost}
          />
        )}
      </div>
    </AdminLayout>
  );
}