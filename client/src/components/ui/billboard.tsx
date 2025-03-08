import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface BillboardProps {
  children: ReactNode;
  className?: string;
}

export function Billboard({ children, className }: BillboardProps) {
  return (
    <div className={cn(
      // Base styles
      "grid gap-6 p-6",
      // Default multi-column layout for larger screens
      "grid-cols-2 md:grid-cols-3",
      // Single column layout for screens smaller than 50vw
      "[max-width:50vw]:grid-cols-1",
      // Ensure children span full width in mobile view
      "[max-width:50vw]:children:w-full",
      // Additional padding adjustments for mobile
      "[max-width:50vw]:p-4",
      className
    )}>
      {children}
    </div>
  )
}

export function BillboardItem({ children, className }: BillboardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4",
      // Ensure full width on mobile
      "[max-width:50vw]:w-full",
      // Center content on mobile
      "[max-width:50vw]:text-center",
      className
    )}>
      {children}
    </div>
  )
}
