import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

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
        <div className="relative min-h-full pb-16">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}