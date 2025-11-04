import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  headerActions,
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 z-[9999999] p-0"
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        {title && (
          <SheetHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
            <h2 className="text-lg font-semibold flex-1">{title}</h2>
            {headerActions && (
              <div className="flex items-center gap-2 ml-4">
                {headerActions}
              </div>
            )}
          </SheetHeader>
        )}
        <div className="relative flex flex-col h-full">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}