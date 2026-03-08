import { useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { PostFormRef } from "@/components/admin/PostForm";

interface UsePostDraftsOptions {
  invalidateKeys?: string[][];
  onCreateSuccess?: () => void;
  onSaveSuccess?: () => void;
}

export function usePostDrafts(options: UsePostDraftsOptions = {}) {
  const {
    invalidateKeys = [["/api/public/posts"]],
    onCreateSuccess,
    onSaveSuccess,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const createFormRef = useRef<PostFormRef>(null);
  const editFormRef = useRef<PostFormRef>(null);

  const invalidateAll = useCallback(async () => {
    for (const key of invalidateKeys) {
      await queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient, invalidateKeys]);

  const handleCreateDraft = useCallback(async () => {
    if (isSavingDraft) return;
    const formData = createFormRef.current?.getFormData();
    if (!formData) return;

    setIsSavingDraft(true);
    try {
      await apiRequest("/api/admin/posts", "POST", {
        ...formData,
        status: "draft",
      });
      toast({
        title: "Success",
        description: "Draft saved successfully",
      });
      await invalidateAll();
      onCreateSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [isSavingDraft, toast, invalidateAll, onCreateSuccess]);

  const handleSaveDraft = useCallback(
    async (editingPostId: number) => {
      if (isSavingDraft) return;
      const formData = editFormRef.current?.getFormData();
      if (!formData) return;

      setIsSavingDraft(true);
      try {
        await apiRequest(`/api/posts/${editingPostId}`, "PATCH", {
          ...formData,
          status: "draft",
        });
        toast({
          title: "Success",
          description: "Draft saved successfully",
        });
        await invalidateAll();
        onSaveSuccess?.();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save draft",
          variant: "destructive",
        });
      } finally {
        setIsSavingDraft(false);
      }
    },
    [isSavingDraft, toast, invalidateAll, onSaveSuccess],
  );

  return {
    isSavingDraft,
    setIsSavingDraft,
    createFormRef,
    editFormRef,
    handleCreateDraft,
    handleSaveDraft,
  };
}
