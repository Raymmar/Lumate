import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface PreviewSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive";
  }[];
}

export function PreviewSidebar({ 
  open, 
  onOpenChange, 
  children, 
  title,
  actions,
}: PreviewSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[480px] sm:max-w-[480px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        role="dialog"
        aria-modal="true"
        onOpenAutoFocus={(e) => {
          // Prevent automatic focus
          e.preventDefault();
        }}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-lg font-semibold">{title}</h2>
          )}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 ml-auto"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={action.variant === "destructive" ? "text-destructive" : undefined}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}