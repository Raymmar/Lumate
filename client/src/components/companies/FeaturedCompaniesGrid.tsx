import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Building } from "lucide-react";
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
  slug: string | null;
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

  const allCompanies = data?.companies || [];
  
  // Filter out companies without featured images
  const companiesWithImages = allCompanies.filter(
    (company: Company) => company.featuredImageUrl
  );
  
  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Featured Companies</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state or hide if no companies with featured images
  if (error || companiesWithImages.length === 0) {
    return null; // Hide the section if error or no companies with images
  }

  // Get random 6 companies with featured images
  const randomCompanies = [...companiesWithImages]
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);

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
          <Link key={company.id} href={`/companies/${company.slug || generateSlug(company.name)}`} className="no-underline">
            <Card className="overflow-hidden h-full transition-all hover:shadow-md cursor-pointer">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img 
                  src={company.featuredImageUrl!} 
                  alt={`${company.name}`} 
                  className="h-full w-full object-cover"
                />
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
      </div>
    </div>
  );
}