import { useParams, Link } from "wouter";
import PageContainer from "@/components/layout/PageContainer";
import CompanyProfile from "@/components/companies/CompanyProfile";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompanyPublicProfilePage() {
  const params = useParams<{ companyName: string }>();

  if (!params.companyName) {
    return (
      <PageContainer>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Company Not Found</h1>
          <p className="text-muted-foreground mb-6">The URL you entered is invalid or the company does not exist.</p>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="container max-w-7xl mx-auto pb-24">
        <div className="mb-6 mt-4">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Directory
          </Link>
        </div>
        
        <CompanyProfile nameSlug={params.companyName} />
      </div>
    </PageContainer>
  );
}