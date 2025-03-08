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
      // Default grid layout for larger screens
      "grid-cols-1 md:grid-cols-3",
      // Additional padding adjustments for mobile
      "p-4 md:p-6",
      className
    )}>
      {children}
    </div>
  )
}

export function BillboardItem({ children, className }: BillboardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 w-full text-center",
      className
    )}>
      {children}
    </div>
  )
}