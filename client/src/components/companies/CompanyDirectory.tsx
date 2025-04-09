import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Building } from "lucide-react";

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
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  industry: string | null;
  size: string | null;
  founded: string | null;
  featuredImageUrl: string | null;
  bio: string | null;
  isPhonePublic: boolean;
  isEmailPublic: boolean;
  ctaText: string | null;
  customLinks: Array<{
    title: string;
    url: string;
    icon?: string;
  }> | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  // Filter companies based on search query
  const filteredCompanies = companies.filter((company: Company) => {
    const query = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      (company.industry && company.industry.toLowerCase().includes(query)) ||
      (company.bio && company.bio.toLowerCase().includes(query)) ||
      (company.tags && company.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search companies..."
            className="w-full"
            disabled
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="py-12 text-center">
        <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Error loading companies</h3>
        <p className="text-muted-foreground">
          There was a problem loading the company directory.
        </p>
      </div>
    );
  }

  // Render empty state if no companies found
  if (companies.length === 0) {
    return (
      <div className="py-12 text-center">
        <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No companies found</h3>
        <p className="text-muted-foreground">
          There are no companies in the directory yet.
        </p>
      </div>
    );
  }

  // Render empty search results
  if (filteredCompanies.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative w-full min-h-[30vh] bg-cover bg-center mb-6 rounded-lg overflow-hidden shadow-sm" style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1563906267088-b029e7101114?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80")'
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Sarasota Tech Member Directory
              </h1>
              <p className="text-lg text-white/90 mb-8">
                Explore a growing directory of Sarasota's most innovative companies.
              </p>
              <div className="w-full max-w-lg">
                <Input
                  placeholder="Search companies..."
                  className="w-full bg-white/90 border-0 focus-visible:ring-primary/70"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="py-12 text-center">
          <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No companies match your search</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms to find what you're looking for.
          </p>
        </div>
      </div>
    );
  }

  // Render companies grid
  return (
    <div className="space-y-4">
      <div className="relative w-full min-h-[30vh] bg-cover bg-center mb-6 rounded-lg overflow-hidden shadow-sm" style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1563906267088-b029e7101114?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80")'
      }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40"></div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Sarasota Tech Member Directory
            </h1>
            <p className="text-lg text-white/90 mb-8">
              Explore a growing directory of Sarasota's most innovative companies.
            </p>
            <div className="w-full max-w-lg">
              <Input
                placeholder="Search companies..."
                className="w-full bg-white/90 border-0 focus-visible:ring-primary/70"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company: Company) => (
          <CompanyCard
            key={company.id}
            id={company.id}
            name={company.name}
            logoUrl={company.logoUrl}
            featuredImageUrl={company.featuredImageUrl}
            industry={company.industry}
            bio={company.bio}
            tags={company.tags}
            slug={generateSlug(company.name)}
          />
        ))}
      </div>
    </div>
  );
}