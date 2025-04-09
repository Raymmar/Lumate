import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink as ExternalLinkIcon, Building, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to generate slug from company name
const generateSlug = (name: string): string => {
  return name
    .replace(/\./g, '')
    .replace(/&/g, 'and')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

interface Company {
  id: number;
  name: string;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  industry: string | null;
  bio: string | null;
  tags: string[] | null;
}

export function FeaturedCompaniesGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      return await response.json();
    }
  });

  const companies = data?.companies || [];
  
  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Featured Companies</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error || companies.length === 0) {
    return null; // Hide the section if error or no companies
  }

  // Get random 5 companies
  const randomCompanies = [...companies]
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Featured Companies</h2>
        <Link href="/companies">
          <Button variant="outline" className="flex items-center gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {randomCompanies.map((company: Company) => (
          <Link key={company.id} href={`/companies/${generateSlug(company.name)}`} className="no-underline">
            <Card className="overflow-hidden h-full transition-all hover:shadow-md cursor-pointer">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {company.featuredImageUrl ? (
                  <img 
                    src={company.featuredImageUrl} 
                    alt={`${company.name}`} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-primary/10 to-primary/30 flex items-center justify-center">
                    {company.logoUrl ? (
                      <img 
                        src={company.logoUrl} 
                        alt={company.name} 
                        className="max-h-16 max-w-16"
                      />
                    ) : (
                      <Building className="h-12 w-12 text-primary/50" />
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  {company.logoUrl && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-muted overflow-hidden">
                      <img 
                        src={company.logoUrl} 
                        alt={company.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold truncate">{company.name}</h3>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        
        {/* View All link in the grid */}
        <Link href="/companies" className="no-underline">
          <Card className="overflow-hidden h-full transition-all hover:shadow-md cursor-pointer flex flex-col justify-center items-center p-6 bg-primary/5">
            <Building className="h-12 w-12 text-primary mb-4" />
            <h3 className="font-semibold text-center">View Full Directory</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">Explore all companies</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}