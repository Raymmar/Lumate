import { useParams } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CompanyProfile from "@/components/companies/CompanyProfile";

export default function CompanyProfilePage() {
  const params = useParams<{ companySlug: string }>();

  if (!params.companySlug) {
    return <div>Invalid profile URL</div>;
  }

  // The companySlug is already URL-encoded from the browser
  const decodedCompanySlug = decodeURIComponent(params.companySlug);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <CompanyProfile companySlug={decodedCompanySlug} />
      </div>
    </DashboardLayout>
  );
}