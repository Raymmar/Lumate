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
        className="w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
        <div className="relative pt-12">
          {/* Positioned Actions */}
          {headerContent && (
            <div className="absolute top-3 left-4">
              {headerContent}
            </div>
          )}

          {/* Main Content */}
          {title && (
            <SheetHeader className="text-left pb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
            </SheetHeader>
          )}
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}