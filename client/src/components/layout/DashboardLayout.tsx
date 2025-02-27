import { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import PeopleDirectory from "@/components/people/PeopleDirectory";

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
      <div className="flex">
        <aside className="w-[350px] min-w-[350px] border-r bg-muted/10 flex flex-col fixed h-[calc(100vh-73px)] left-0">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col">
            <div className="flex-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Next event</h2>
                <a href="/calendar" className="text-xs text-muted-foreground hover:text-primary">
                  View full calendar
                </a>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PeopleDirectory />
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 ml-[350px] min-h-[calc(100vh-73px)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}