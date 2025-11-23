import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserPlus, CreditCard, DollarSign, ExternalLink, Tickets, Coins, Building, RefreshCw, TrendingUp, ShoppingCart } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { useState, useEffect } from "react";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import { Plus } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RevenueData {
  totalRevenue: number;
  revenueByPrice: {
    id: string;
    nickname?: string;
    productName?: string;
    revenue: number;
    subscriptionCount: number;
    unitAmount?: number;
  }[];
}

interface RevenueOverview {
  totalRevenue: number;
  thisMonthRevenue: number;
  subscriptionRevenue: number;
  activeSubscriptions: number;
  totalCharges: number;
  totalCustomers: number;
}

interface CustomerRevenue {
  customerId: string;
  email: string;
  name?: string;
  totalPaid: number;
  subscriptionRevenue: number;
  lastPayment?: string;
  status: string;
}

interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  subscriptions: number;
  charges: number;
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
  
  // Fetch subscription revenue data (for membership revenue)
  const { data: revenueData, isLoading: isRevenueLoading } = useQuery<RevenueData>({
    queryKey: ["/api/stripe/revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }
      return response.json();
    },
    retry: 1
  });

  // Fetch comprehensive revenue overview
  const { data: revenueOverview, isLoading: isOverviewLoading, refetch: refetchRevenue } = useQuery<RevenueOverview>({
    queryKey: ["/api/stripe/revenue-overview"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/revenue-overview");
      if (!response.ok) {
        throw new Error("Failed to fetch revenue overview");
      }
      return response.json();
    },
    retry: 1
  });

  // Fetch customer revenue data
  const { data: customerRevenue, isLoading: isCustomerLoading } = useQuery<CustomerRevenue[]>({
    queryKey: ["/api/stripe/customer-revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/customer-revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch customer revenue");
      }
      return response.json();
    },
    retry: 1
  });

  // Fetch product revenue data
  const { data: productRevenue, isLoading: isProductLoading } = useQuery<ProductRevenue[]>({
    queryKey: ["/api/stripe/product-revenue"],
    queryFn: async () => {
      const response = await fetch("/api/stripe/product-revenue");
      if (!response.ok) {
        throw new Error("Failed to fetch product revenue");
      }
      return response.json();
    },
    retry: 1
  });

  // Posts management state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost & { tags?: string[] }) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', data);
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Post updated successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare data for pie chart
  const pieChartData = revenueOverview ? [
    {
      name: 'Membership Revenue',
      value: revenueOverview.subscriptionRevenue,
      color: '#10b981'
    },
    {
      name: 'Other Revenue',
      value: Math.max(0, revenueOverview.totalRevenue - revenueOverview.subscriptionRevenue),
      color: '#6366f1'
    }
  ].filter(item => item.value > 0) : [];

  return (
    <AdminLayout title={
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('https://lu.ma/calendar/manage/cal-piKozq5UuJw79D', '_blank')}
            className="text-sm"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Post
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewMember}
          >
            <Plus className="w-4 h-4 mr-2" />
            Member
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-sm"
            onClick={handleNewCompany}
          >
            <Plus className="w-4 h-4 mr-2" />
            Company
          </Button>
        </div>
      </div>
    }>
      {/* Stats Grid - Two columns on mobile, Three on desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          title="Total Revenue"
          value={
            revenueOverview?.totalRevenue 
              ? `$${revenueOverview.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : '--'
          }
          icon={DollarSign}
          isLoading={isOverviewLoading}
          description={`${revenueOverview?.totalCharges || 0} total charges`}
        />
        <StatCard
          title="This Month"
          value={
            revenueOverview?.thisMonthRevenue 
              ? `$${revenueOverview.thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : '--'
          }
          icon={TrendingUp}
          isLoading={isOverviewLoading}
          description="Month-to-date revenue"
        />
        <StatCard
          title="Membership Revenue"
          value={
            revenueOverview?.subscriptionRevenue 
              ? `$${revenueOverview.subscriptionRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : '--'
          }
          icon={Coins}
          isLoading={isOverviewLoading}
          description={`${revenueOverview?.activeSubscriptions || 0} active subscriptions`}
        />
        <StatCard
          title="Events"
          value={statsData?.events || 0}
          icon={Calendar}
          isLoading={isLoading}
          description="Since August 2023"
        />
        <StatCard
          title="Subscribers"
          value={statsData?.uniqueAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="68% open rate 23% click rate"
        />
        <StatCard
          title="Verified Members"
          value={statsData?.users || 0}
          icon={UserPlus}
          isLoading={isLoading}
          description="Completed account verification"
        />
      </div>

      {/* Revenue Analytics Section */}
      <div className="mt-8 space-y-8">
        {/* Revenue Overview with Pie Chart */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Revenue Distribution</h2>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: $${value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </div>

          {/* Product Revenue */}
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Revenue by Product</h2>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {productRevenue && productRevenue.length > 0 ? (
                productRevenue.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div>
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.subscriptions} subscriptions • {product.charges} charges
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${product.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {isProductLoading ? 'Loading product data...' : 'No product revenue found'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Revenue Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Customer Revenue</h2>
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
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Total Paid</th>
                  <th className="px-4 py-3 text-right font-medium">Subscription</th>
                  <th className="px-4 py-3 text-right font-medium">Last Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customerRevenue && customerRevenue.length > 0 ? (
                  customerRevenue.slice(0, 20).map((customer) => (
                    <tr key={customer.customerId} className="border-t">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{customer.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        ${customer.totalPaid.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        ${customer.subscriptionRevenue.toFixed(2)}/mo
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          customer.status === 'Active Subscriber' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t">
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {isCustomerLoading ? 'Loading customer data...' : 'No customer revenue found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {customerRevenue && customerRevenue.length > 20 && (
              <div className="px-4 py-3 border-t text-sm text-muted-foreground text-center">
                Showing top 20 of {customerRevenue.length} customers
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Posts</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <PostsTable onSelect={setEditingPost} />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <PostModal 
        open={isCreating} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsSubmitting(false);
          }
        }}
        title="Create New Post"
        mode="create"
        onSubmit={() => {}} // Not used anymore - button submits form directly
        isSubmitting={isSubmitting}
      >
        <PostForm 
          onSubmit={handleCreatePost}
          isEditing={false}
        />
      </PostModal>

      {/* Edit Post Modal */}
      <PostModal 
        open={!!editingPost} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingPost(null);
            setIsSubmitting(false);
          }
        }}
        title="Edit Post"
        mode="edit"
        onSubmit={() => {}} // Not used anymore - button submits form directly
        isSubmitting={isSubmitting}
      >
        {editingPost && (
          <PostForm 
            onSubmit={handleUpdatePost}
            defaultValues={{
              title: editingPost.title,
              summary: editingPost.summary || "",
              body: editingPost.body || "",
              featuredImage: editingPost.featuredImage || "",
              videoUrl: editingPost.videoUrl || "",
              ctaLink: editingPost.ctaLink || "",
              ctaLabel: editingPost.ctaLabel || "",
              isPinned: editingPost.isPinned,
              membersOnly: editingPost.membersOnly,
              tags: editingPost.tags || []
            }}
            isEditing={true}
          />
        )}
      </PostModal>
    </AdminLayout>
  );
}