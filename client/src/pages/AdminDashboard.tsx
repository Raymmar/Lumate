import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserPlus, CreditCard, DollarSign, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { useState } from "react";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import { Plus } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SearchInput } from "@/components/admin/SearchInput";

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

  // Posts management state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all posts for navigation
  const { data: postsData } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/admin/posts"]
  });

  const handleCreatePost = async (data: InsertPost) => {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('https://lu.ma/calendar/manage/cal-piKozq5UuJw79D', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Calendar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>
    }>
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
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

      {/* Posts Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Posts</h2>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search posts..."
          />
        </div>
        <PostsTable onSelect={setSelectedPost} />
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