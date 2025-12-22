import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  mode: 'create' | 'edit';
  onSubmit: () => void;
  onSaveDraft?: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  isDeleting?: boolean;
  currentStatus?: 'draft' | 'published';
  postTitle?: string;
}

export function PostModal({ 
  open, 
  onOpenChange, 
  children, 
  title,
  mode,
  onSubmit,
  onSaveDraft,
  onDelete,
  isSubmitting = false,
  isSavingDraft = false,
  isDeleting = false,
  currentStatus = 'published',
  postTitle = ''
}: PostModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-4xl w-[90vw] h-[85vh] max-h-[85vh] p-0 overflow-hidden [&>button]:hidden"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center justify-between relative">
              {/* Left side - Close button and Delete button (edit mode only) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0"
                  data-testid="button-close-modal"
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {mode === 'edit' && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isSubmitting || isSavingDraft || isDeleting}
                    data-testid="button-delete-post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Centered title */}
              <DialogTitle className="text-lg font-semibold absolute left-1/2 transform -translate-x-1/2">
                {title || "Post Editor"}
              </DialogTitle>
              
              {/* Actions on the right */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || isSavingDraft || isDeleting}
                  onClick={onSaveDraft}
                  data-testid="button-save-draft"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Draft'
                  )}
                </Button>
                <Button
                  type="submit"
                  form="post-form"
                  disabled={isSubmitting || isSavingDraft || isDeleting}
                  size="sm"
                  data-testid={mode === 'create' ? 'button-publish-post' : 'button-save-changes'}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'create' ? 'Publishing...' : 'Saving...'}
                    </>
                  ) : (
                    mode === 'create' ? 'Publish Post' : (currentStatus === 'draft' ? 'Publish' : 'Save Changes')
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Content area with scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postTitle}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete?.();
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-modal"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
