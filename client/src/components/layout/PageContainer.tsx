import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-6 ${className}`}>
      {children}
    </div>
  );
}