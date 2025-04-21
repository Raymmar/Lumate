import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PostPreview } from "@/components/admin/PostPreview";
import { PinnedPostsCarousel } from "./PinnedPostsCarousel";
import { NewsList } from "./NewsList";
import { useAuth } from "@/hooks/use-auth";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { Post, InsertPost } from "@shared/schema";

export function NewsContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const handleCreatePost = async (data: InsertPost) => {
    try {
      await apiRequest('/api/admin/posts', 'POST', data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  const handleSelectPost = (post: Post, isEditing = false) => {
    setSelectedPost(post);
    setIsEditing(isEditing);
  };

  const canCreatePosts = user?.isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Community News</h1>
        {canCreatePosts && (
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        )}
      </div>

      {/* Featured Posts Carousel */}
      <PinnedPostsCarousel onSelect={handleSelectPost} />

      {/* News List */}
      <NewsList 
        posts={postsData?.posts || []} 
        isLoading={isLoading} 
        onSelect={handleSelectPost}
        canCreatePosts={canCreatePosts}
      />

      {/* Post Preview */}
      {selectedPost && (
        <PostPreview
          post={selectedPost}
          onClose={() => {
            setSelectedPost(null);
            setIsEditing(false);
          }}
          isEditing={isEditing}
          readOnly={!canCreatePosts}
          posts={postsData?.posts || []}
          onNavigate={handleSelectPost}
        />
      )}

      {/* Create Post Form */}
      {isCreating && (
        <PostPreview
          isNew={true}
          onClose={() => setIsCreating(false)}
          onSave={handleCreatePost}
        />
      )}
    </div>
  );
}