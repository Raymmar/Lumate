import DashboardLayout from "@/components/layout/DashboardLayout";
import CompanyDirectory from "@/components/companies/CompanyDirectory";
import { Briefcase } from "lucide-react";

export default function CompaniesPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Company Directory</h1>
          </div>
          <p className="text-muted-foreground">
            Browse and discover companies in the Sarasota tech community.
          </p>
        </div>
        
        <CompanyDirectory />
      </div>
    </DashboardLayout>
  );
}