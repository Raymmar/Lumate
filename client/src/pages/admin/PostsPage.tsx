import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PostsPage() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreatePost = async (data: InsertPost) => {
    try {
      await apiRequest('/api/admin/posts', 'POST', data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  const handleNewPostClick = () => {
    console.log("New Post button clicked");
    setIsCreating(true);
    console.log("isCreating set to true");
  };

  console.log("PostsPage render - isCreating:", isCreating, "selectedPost:", selectedPost);

  return (
    <AdminLayout title={
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={handleNewPostClick}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>
    }>
      <PostsTable onSelect={setSelectedPost} />
      {(selectedPost || isCreating) && (
        <PostPreview
          post={selectedPost || undefined}
          isNew={isCreating}
          onClose={() => {
            console.log("PostPreview onClose called");
            setSelectedPost(null);
            setIsCreating(false);
          }}
          onSave={handleCreatePost}
        />
      )}
    </AdminLayout>
  );
}