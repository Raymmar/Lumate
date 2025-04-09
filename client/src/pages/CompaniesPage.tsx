import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { CompanyDirectory } from "@/components/companies/CompanyDirectory";

export default function CompaniesPage() {
  return (
    <DashboardLayout>
      <PageContainer>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Directory</h1>
            <p className="mt-2 text-muted-foreground">
              Explore companies and organizations in our community
            </p>
          </div>
          
          <CompanyDirectory />
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}