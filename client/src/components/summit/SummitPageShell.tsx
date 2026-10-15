import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";

/** Page chrome shared by the summit hub and year pages. */
export function SummitPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <PageContainer className="max-w-[1440px]">
          <NavBar />
        </PageContainer>
      </div>
      {children}
    </div>
  );
}
