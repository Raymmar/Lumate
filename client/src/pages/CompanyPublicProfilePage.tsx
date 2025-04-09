import { useParams, Link } from "wouter";
import { PageContainer } from "@/components/layout/PageContainer";
import CompanyProfile from "@/components/companies/CompanyProfile";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function CompanyPublicProfilePage() {
  const params = useParams<{ companyName: string }>();

  if (!params.companyName) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
          <p className="text-muted-foreground mb-6">The URL you entered is invalid or the company does not exist.</p>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto pb-24">
        
        <CompanyProfile nameSlug={params.companyName} />
      </div>
    </DashboardLayout>
  );
}