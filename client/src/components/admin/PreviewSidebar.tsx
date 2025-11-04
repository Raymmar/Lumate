import { Sheet, SheetContent, SheetHeader, SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
  navigation?: React.ReactNode;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  headerActions,
  navigation,
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 z-[9999999] p-0 [&>button]:hidden"
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        {title && (
          <div className="sticky top-0 z-10 bg-background">
            <SheetHeader className="border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <h2 className="text-lg font-semibold flex-1 min-w-0 truncate" data-testid="text-company-name">{title}</h2>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {headerActions}
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    data-testid="button-close-preview"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>
            {navigation && (
              <div className="border-b">
                {navigation}
              </div>
            )}
          </div>
        )}
        <div className="relative flex flex-col h-full">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}