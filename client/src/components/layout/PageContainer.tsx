import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`max-w-[1440px] mx-auto w-full px-4 md:px-6 ${className}`}>
      {children}
    </div>
  );
}