import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Post, type InsertPost } from "@shared/schema";
import { ArticleContent } from "@/components/news/ArticleContent";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { formatPostTitleForUrl } from "@/lib/utils";
import NotFound from "./not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ArticlePage() {
  const { title } = useParams<{ title: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const { data: postsData, isLoading: isPostsLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest(`/api/posts/${postId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
      setShowDeleteConfirm(false);
      setLocation("/news");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  });

  const posts = postsData?.posts || [];
  const post = postData;

  const isExternalUrl = (url: string) => {
    if (!url) return false;
    if (url.startsWith('/')) return false;
    try {
      const urlObj = new URL(url);
      return !urlObj.hostname.includes('sarasota.tech');
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (post?.redirectUrl) {
      if (isExternalUrl(post.redirectUrl)) {
        window.location.replace(post.redirectUrl);
      } else {
        setLocation(post.redirectUrl);
      }
    }
  }, [post?.redirectUrl, setLocation]);

  const handleNavigate = (nextPost: Post) => {
    const slug = formatPostTitleForUrl(nextPost.title, nextPost.id.toString());
    setLocation(`/post/${slug}`);
  };

  const handleBackToNews = () => {
    setLocation("/news");
  };

  const canCreatePosts = Boolean(user?.isAdmin || user?.permissions?.includes('publish_content'));

  const canEditPost = (post: Post) => {
    return Boolean(
      user?.isAdmin ||
      (post.creatorId === user?.id)
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

  const handleDeletePost = () => {
    if (post) {
      setShowDeleteConfirm(true);
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
        await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', data);
        toast({
          title: "Success",
          description: "Post updated successfully"
        });
        
        await queryClient.invalidateQueries({ queryKey: ["/api/posts/by-title", title] });
        await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
      } else {
        await apiRequest('/api/admin/posts', 'POST', data);
        toast({
          title: "Success",
          description: "Post created successfully"
        });
        
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
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          <div className="mt-8">
            <Skeleton className="w-full aspect-video" />
          </div>
          
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2"
                    data-testid="button-post-actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleEditPost}
                    data-testid="menu-edit-post"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeletePost}
                    className="text-red-600 focus:text-red-600"
                    data-testid="menu-delete-post"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

        <ArticleContent
          post={post}
          posts={posts}
          onNavigate={handleNavigate}
          showNavigation={true}
          showMembersOnlyOverlay={true}
        />
        
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
              redirectUrl: editingPost?.redirectUrl || "",
              isPinned: editingPost?.isPinned || false,
              membersOnly: editingPost?.membersOnly || false,
              tags: editingPost?.tags || []
            } : undefined}
            isEditing={isEditing}
          />
        </PostModal>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{post?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => post && deleteMutation.mutate(post.id)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-article"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
