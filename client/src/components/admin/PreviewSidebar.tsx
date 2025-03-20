import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none"
        side="right"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-2 mb-4">
            {title && (
              <SheetHeader>
                <h2 className="text-lg font-semibold">{title}</h2>
              </SheetHeader>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          <div className="flex-1">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}