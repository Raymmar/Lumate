import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  showNavigation,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 z-[9999999]"
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        {title && (
          <SheetHeader>
            <h2 className="text-lg font-semibold">{title}</h2>
          </SheetHeader>
        )}
        <div className="relative flex flex-col h-full">
          <div className="flex-1 overflow-y-auto pb-16">
            {children}
          </div>

          {/* Navigation Section - Fixed to bottom */}
          {showNavigation && (onPrevious || onNext) && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 border-t bg-background">
              <div className="flex justify-between items-center max-w-full">
                <Button
                  variant="ghost"
                  disabled={!hasPrevious}
                  onClick={onPrevious}
                  className="min-w-[100px] h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={!hasNext}
                  onClick={onNext}
                  className="min-w-[100px] h-8"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}