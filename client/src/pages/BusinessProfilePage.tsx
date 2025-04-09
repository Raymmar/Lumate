import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CompanyProfile from "../components/companies/CompanyProfile";
import { formatCompanyNameForUrl } from "@/lib/utils";

export default function BusinessProfilePage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/business/:slug");
  const slug = params?.slug;

  const [companyId, setCompanyId] = useState<number | null>(null);
  
  // Fetch company by slug
  const { data: companyData, isLoading, error } = useQuery({
    queryKey: ['/api/companies/slug', slug],
    queryFn: async () => {
      const response = await fetch(`/api/companies/slug/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company');
      }
      return response.json();
    },
    enabled: !!slug,
    retry: false, // Don't retry since a 404 is expected for invalid slugs
  });

  useEffect(() => {
    if (companyData?.company) {
      setCompanyId(companyData.company.id);
    }
  }, [companyData]);

  useEffect(() => {
    // Redirect to 404 page if company is not found and we're not still loading
    if (error && !isLoading) {
      setLocation("/not-found");
    }
  }, [error, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyData?.company) {
    return null; // This will show briefly before redirecting to 404
  }

  const company = companyData.company;
  
  // If the URL doesn't match the canonical slug, redirect to the canonical URL
  const canonicalSlug = formatCompanyNameForUrl(company.name, company.id.toString());
  if (canonicalSlug !== slug) {
    setLocation(`/business/${canonicalSlug}`);
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <CompanyProfile company={company} />
    </div>
  );
}