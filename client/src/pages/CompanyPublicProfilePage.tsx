import { useParams } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CompanyProfile from "@/components/companies/CompanyProfile";

export default function CompanyPublicProfilePage() {
  const params = useParams<{ companyName: string }>();

  if (!params.companyName) {
    return <div>Invalid company URL</div>;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto pt-3 pb-24">
        <CompanyProfile nameSlug={params.companyName} />
      </div>
    </DashboardLayout>
  );
}