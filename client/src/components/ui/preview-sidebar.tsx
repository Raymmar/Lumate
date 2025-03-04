import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;  // Make title optional
}

export function PreviewSidebar({ open, onOpenChange, children, title }: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[480px] sm:max-w-[480px] overflow-y-auto"
        // Add these props to manage focus behavior
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        {title && (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
