import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a person from the directory to view their profile</p>
      </div>
    </DashboardLayout>
  );
}