import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PostPreview } from "@/components/admin/PostPreview";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import { PinnedPostsCarousel } from "./PinnedPostsCarousel";
import { PublicPostsTable } from "@/components/bulletin/PublicPostsTable";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { formatPostTitleForUrl } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";
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
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const handleCreatePost = async (data: InsertPost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/admin/posts/${editingPost.id}`, 'PATCH', data);
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Post updated successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
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

  const [, setLocation] = useLocation();
  
  const handleSelectPost = (post: Post, isEditing = false) => {
    if (isEditing && (user?.isAdmin || post.creatorId === user?.id)) {
      // Open modal for editing
      setEditingPost(post);
    } else {
      // For regular viewing, navigate to the article page
      const slug = formatPostTitleForUrl(post.title, post.id.toString());
      setLocation(`/post/${slug}`);
    }
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
      <PublicPostsTable 
        onSelect={handleSelectPost}
        onCreatePost={() => setIsCreating(true)}
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
        actions={
          <Button
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Post"
            )}
          </Button>
        }
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
        actions={
          <Button
            onClick={() => {
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        }
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
    </div>
  );
}