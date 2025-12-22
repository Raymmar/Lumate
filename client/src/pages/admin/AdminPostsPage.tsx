import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm, PostFormRef } from "@/components/admin/PostForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Post, InsertPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export default function AdminPostsPage() {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const { toast } = useToast();
  const createFormRef = useRef<PostFormRef>(null);
  const editFormRef = useRef<PostFormRef>(null);

  const handleCreatePost = async (data: InsertPost & { tags?: string[] }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest('/api/admin/posts', 'POST', { ...data, status: 'published' });
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post published successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDraft = async () => {
    if (isSavingDraft) return;
    const formData = createFormRef.current?.getFormData();
    if (!formData) return;
    
    setIsSavingDraft(true);
    try {
      await apiRequest('/api/admin/posts', 'POST', { ...formData, status: 'draft' });
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Draft saved successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive"
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost & { tags?: string[] }) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', { ...data, status: 'published' });
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

  const handleSaveDraft = async () => {
    if (!editingPost || isSavingDraft) return;
    const formData = editFormRef.current?.getFormData();
    if (!formData) return;
    
    setIsSavingDraft(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', { ...formData, status: 'draft' });
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Draft saved successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive"
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <AdminLayout title={
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Button 
          className="bg-primary hover:bg-primary/90 text-sm"
          onClick={() => setIsCreating(true)}
          data-testid="button-new-post"
        >
          <Plus className="w-4 h-4 mr-2" />
          Post
        </Button>
      </div>
    }>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full inline-block align-middle">
          <PostsTable onSelect={setEditingPost} />
        </div>
      </div>

      <PostModal 
        open={isCreating} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsSubmitting(false);
            setIsSavingDraft(false);
          }
        }}
        title="Create New Post"
        mode="create"
        onSubmit={() => {}}
        onSaveDraft={handleCreateDraft}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
      >
        <PostForm 
          ref={createFormRef}
          onSubmit={handleCreatePost}
          isEditing={false}
        />
      </PostModal>

      <PostModal 
        open={!!editingPost} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingPost(null);
            setIsSubmitting(false);
            setIsSavingDraft(false);
          }
        }}
        title="Edit Post"
        mode="edit"
        onSubmit={() => {}}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        currentStatus={(editingPost?.status as 'draft' | 'published') || 'published'}
      >
        {editingPost && (
          <PostForm 
            ref={editFormRef}
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
