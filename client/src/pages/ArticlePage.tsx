import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Post, type InsertPost } from "@shared/schema";
import { ArticleContent } from "@/components/news/ArticleContent";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Plus, Loader2 } from "lucide-react";
import { formatPostTitleForUrl } from "@/lib/utils";
import NotFound from "./not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function ArticlePage() {
  const { title } = useParams<{ title: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the specific post by slug
  const { data: postData, isLoading: isPostLoading, error: postError } = useQuery<Post>({
    queryKey: ["/api/posts/by-title", title],
    queryFn: async () => {
      const response = await fetch(`/api/posts/by-title/${title}`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  });

  // Fetch all posts for navigation
  const { data: postsData, isLoading: isPostsLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const posts = postsData?.posts || [];
  const post = postData;

  const handleNavigate = (nextPost: Post) => {
    const slug = formatPostTitleForUrl(nextPost.title, nextPost.id.toString());
    setLocation(`/post/${slug}`);
  };

  const handleBackToNews = () => {
    setLocation("/news");
  };

  // Check if user can create posts (admin or has publish_content permission)
  const canCreatePosts = Boolean(user?.isAdmin || user?.permissions?.includes('publish_content'));

  // Check if user can edit a specific post
  const canEditPost = (post: Post) => {
    return Boolean(
      user?.isAdmin || // Admin can edit any post
      (post.creatorId === user?.id) // Post creator can edit their own posts
    );
  };

  const handleCreatePost = () => {
    setIsEditing(false);
    setEditingPost(undefined);
    setIsModalOpen(true);
  };

  const handleEditPost = () => {
    if (post) {
      setIsEditing(true);
      setEditingPost(post);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingPost(undefined);
    setIsSubmitting(false);
  };

  const handleSubmitPost = async (data: InsertPost & { tags?: string[] }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEditing && editingPost) {
        // Update existing post
        await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', data);
        toast({
          title: "Success",
          description: "Post updated successfully"
        });
        
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["/api/posts/by-title", title] });
        await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
      } else {
        // Create new post
        await apiRequest('/api/admin/posts', 'POST', data);
        toast({
          title: "Success",
          description: "Post created successfully"
        });
        
        // Navigate to the new post
        const slug = formatPostTitleForUrl(data.title, '');
        // We'll let the backend handle the redirect since we don't have the ID yet
        // For now, just close the modal and refresh
        await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
      }
      
      handleCloseModal();
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "Failed to update post" : "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPostLoading || isPostsLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Back button skeleton */}
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          
          {/* Title skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* Featured image skeleton */}
          <div className="mt-8">
            <Skeleton className="w-full aspect-video" />
          </div>
          
          {/* Content skeleton */}
          <div className="mt-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (postError || !post) {
    return <NotFound />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header with Back button and Edit/New Post buttons */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBackToNews}
            className="gap-2"
            data-testid="button-back-to-news"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Button>
          
          <div className="flex items-center gap-2">
            {post && canEditPost(post) && (
              <Button
                variant="outline"
                onClick={handleEditPost}
                className="gap-2"
                data-testid="button-edit-post"
              >
                <Edit className="w-4 h-4" />
                Edit Post
              </Button>
            )}
            {canCreatePosts && (
              <Button
                variant="outline"
                onClick={handleCreatePost}
                className="gap-2"
                data-testid="button-create-post"
              >
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            )}
          </div>
        </div>

        {/* Article Content */}
        <ArticleContent
          post={post}
          posts={posts}
          onNavigate={handleNavigate}
          showNavigation={true}
          showMembersOnlyOverlay={true}
        />
        
        {/* Post Modal */}
        <PostModal
          open={isModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseModal();
            }
          }}
          title={isEditing ? "Edit Post" : "Create New Post"}
          mode={isEditing ? "edit" : "create"}
          onSubmit={() => {
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          isSubmitting={isSubmitting}
        >
          <PostForm
            onSubmit={handleSubmitPost}
            defaultValues={isEditing ? {
              title: editingPost?.title || "",
              summary: editingPost?.summary || "",
              body: editingPost?.body || "",
              featuredImage: editingPost?.featuredImage || "",
              videoUrl: editingPost?.videoUrl || "",
              ctaLink: editingPost?.ctaLink || "",
              ctaLabel: editingPost?.ctaLabel || "",
              isPinned: editingPost?.isPinned || false,
              membersOnly: editingPost?.membersOnly || false,
              tags: [] // Tags will be handled by PostForm if needed
            } : undefined}
            isEditing={isEditing}
          />
        </PostModal>
      </div>
    </DashboardLayout>
  );
}