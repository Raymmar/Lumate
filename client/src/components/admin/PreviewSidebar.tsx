import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  headerContent 
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[480px] sm:max-w-[480px] flex flex-col h-full outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{
          outline: 'none',
          boxShadow: 'none'
        }}
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        <div className="flex flex-col h-full">
          {(title || headerContent) && (
            <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {headerContent}
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto relative">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}