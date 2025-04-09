import DashboardLayout from "@/components/layout/DashboardLayout";
import CompanyDirectory from "@/components/companies/CompanyDirectory";
import { Briefcase } from "lucide-react";

export default function CompaniesPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <CompanyDirectory />
      </div>
    </DashboardLayout>
  );
}