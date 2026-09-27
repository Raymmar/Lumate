import { useState } from "react";
import { useLocation } from "wouter";
import type { InsertPost, Post, Summit } from "@shared/schema";
import { formatPostTitleForUrl } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import { usePostDrafts } from "@/hooks/use-post-drafts";
import { PublicPostsTable, PUBLIC_POSTS_QUERY_KEY } from "@/components/bulletin/PublicPostsTable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

/** News posts linked to one summit year; new posts created here are linked to it. */
export function SummitNewsSection({ summit }: { summit: Summit }) {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    isSavingDraft,
    createFormRef,
    editFormRef,
    handleCreateDraft,
    handleSaveDraft: rawSaveDraft,
  } = usePostDrafts({
    onCreateSuccess: () => setIsCreating(false),
    onSaveSuccess: () => setEditingPost(null),
  });

  const handleSaveDraft = () => editingPost && rawSaveDraft(editingPost.id);

  const handlePostClick = (post: Post, isEditing = false) => {
    if (isEditing) {
      setEditingPost(post);
    } else {
      const slug = formatPostTitleForUrl(post.title, post.id.toString());
      setLocation(`/post/${slug}`);
    }
  };

  const handleCreatePost = async (data: InsertPost & { tags?: string[] }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const createdPost = (await apiRequest(
        "/api/admin/posts",
        "POST",
        data,
      )) as Post;

      // Optimistically update the cache with the new post
      queryClient.setQueryData(
        PUBLIC_POSTS_QUERY_KEY,
        (old: { posts: Post[] } | undefined) => {
          if (!old) return old;

          // Create an optimistic post object
          const optimisticPost: Post = {
            id: createdPost.id || Date.now(), // Use server ID or temporary ID
            title: data.title,
            summary: data.summary || null,
            body: data.body,
            featuredImage: data.featuredImage || null,
            videoUrl: data.videoUrl || null,
            ctaLink: data.ctaLink || null,
            ctaLabel: data.ctaLabel || null,
            redirectUrl: data.redirectUrl || null,
            status: data.status || "published",
            summitId: data.summitId ?? summit.id,
            isPinned: data.isPinned || false,
            membersOnly: data.membersOnly || false,
            creatorId: user?.id || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            creator: user
              ? {
                  id: user.id,
                  displayName: user.displayName || "Unknown",
                }
              : undefined,
            tags: data.tags || [],
          };

          return {
            posts: [optimisticPost, ...old.posts],
          };
        },
      );

      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully",
      });

      // Invalidate to fetch the real data from the server
      await queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, "PATCH", data);
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-90vw">
        <PublicPostsTable
          onSelect={handlePostClick}
          onCreatePost={() => setIsCreating(true)}
          filterSummitId={summit.id}
          title={`${summit.year} Summit News`}
          maxPosts={50}
        />
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
        title="Create New Summit Post"
        mode="create"
        onSubmit={() => {
          const form = document.querySelector("form");
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        onSaveDraft={handleCreateDraft}
      >
        <PostForm
          ref={createFormRef}
          onSubmit={handleCreatePost}
          defaultValues={{ tags: [`summit ${summit.year}`], summitId: summit.id }}
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
        title="Edit Summit Post"
        mode="edit"
        onSubmit={() => {
          const form = document.querySelector("form");
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        onSaveDraft={handleSaveDraft}
      >
        <PostForm
          ref={editFormRef}
          onSubmit={handleUpdatePost}
          defaultValues={editingPost || undefined}
          isEditing={true}
        />
      </PostModal>
    </>
  );
}
