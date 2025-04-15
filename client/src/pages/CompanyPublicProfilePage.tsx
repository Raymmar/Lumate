import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import CompanyProfile from "@/components/companies/CompanyProfile";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/ui/seo";

export default function CompanyPublicProfilePage() {
  // Using the companySlug parameter from the URL
  const params = useParams<{ companySlug: string }>();
  
  // Get the slug directly from the URL parameters
  const companySlug = params.companySlug;

  if (!companySlug) {
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

  // Fetch company data for SEO at the page level
  const { data: companyData } = useQuery<{company: any}>({
    queryKey: ['/api/companies/by-slug', companySlug],
    queryFn: async () => {
      const response = await fetch(`/api/companies/by-slug/${encodeURIComponent(companySlug)}`);
      if (!response.ok) return { company: null };
      return await response.json();
    }
  });

  const company = companyData?.company;

  // Generate SEO metadata
  const seoTitle = company?.name ? `${company.name} | Sarasota Tech` : 'Company Profile | Sarasota Tech';
  const seoDescription = company?.bio || company?.description || 'View company profile on Sarasota Tech - connecting Sarasota\'s tech community.';
  const seoImage = company?.featuredImageUrl || undefined;

  return (
    <DashboardLayout>
      {/* Place SEO component at the page level for proper social sharing */}
      {company && <SEO title={seoTitle} description={seoDescription} image={seoImage} />}
      
      <div className="container max-w-7xl mx-auto pb-24">
        {/* Pass the slug to the CompanyProfile component */}
        <CompanyProfile nameSlug={companySlug} />
      </div>
    </DashboardLayout>
  );
}