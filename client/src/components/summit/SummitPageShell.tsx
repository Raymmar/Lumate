import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";

/** Page chrome shared by the summit hub and year pages: sunburst background and sticky nav. */
export function SummitPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Gradient Sunburst Background - centered on top right corner */}
      <div
        className="fixed top-0 right-0 pointer-events-none z-0 overflow-hidden"
        style={{ transform: "translate(50%, -50%)" }}
      >
        <img
          src="https://file-upload.replit.app/api/storage/images%2F1761418188502-gradient-sunburst.png"
          alt=""
          className="w-auto h-auto opacity-80 max-w-none"
        />
      </div>
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
