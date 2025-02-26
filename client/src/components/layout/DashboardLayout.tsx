import { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Luma Dashboard</h1>
          <div className="flex items-center space-x-2">
            <AdminMenu />
          </div>
        </div>
      </header>
      <main className="container mx-auto">{children}</main>
    </div>
  );
}
