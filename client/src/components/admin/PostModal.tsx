import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function PostModal({ 
  open, 
  onOpenChange, 
  children, 
  title 
}: PostModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl w-[90vw] h-[85vh] max-h-[85vh] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus to avoid form field focus issues
          e.preventDefault();
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {title || "Post Editor"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Content area with scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}