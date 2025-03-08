import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
  isAdminView?: boolean;
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  headerContent,
  isAdminView = false
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className={`w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${isAdminView ? 'border-l' : ''}`}
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
        {(title || headerContent) && (
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {headerContent}
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}