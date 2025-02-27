import DashboardLayout from "@/components/layout/DashboardLayout";
import PersonProfile from "@/components/people/PersonProfile";
import { useParams } from "wouter";

export default function PersonProfilePage() {
  const { id } = useParams();
  
  return (
    <DashboardLayout>
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
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 ml-[350px] min-h-[calc(100vh-73px)] overflow-y-auto">
          <PersonProfile personId={id} />
        </main>
      </div>
    </DashboardLayout>
  );
}
