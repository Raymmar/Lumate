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
        className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 z-[9999999] relative"
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        {/* Close button - positioned absolutely in the top-right corner */}
        <Button
          variant="ghost"
          className="absolute right-4 top-4 h-10 w-10 rounded-full hover:bg-muted/50 transition-colors"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </Button>

        {/* Add spacing for the close button */}
        <div className="pt-8">
          {title && (
            <SheetHeader>
              <h2 className="text-lg font-semibold">{title}</h2>
            </SheetHeader>
          )}
          <div className="relative flex flex-col h-full">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}