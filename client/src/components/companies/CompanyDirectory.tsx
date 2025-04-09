import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CompanyCard } from "./CompanyCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
    refetchOnWindowFocus: false,
  });
  
  // Filter companies based on search query
  const filteredCompanies = companies.filter((company) => {
    const searchLower = searchQuery.toLowerCase();
    
    // Search by name
    if (company.name?.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search by industry
    if (company.industry?.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search by tags
    if (company.tags && Array.isArray(company.tags)) {
      return company.tags.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
    }
    
    return false;
  });

  return (
    <div className="w-full space-y-6">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search companies by name, industry, or tags..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-[300px] animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : (
        <>
          {filteredCompanies.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-medium">No companies found</p>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  id={company.id}
                  name={company.name}
                  logoUrl={company.logoUrl}
                  featuredImageUrl={company.featuredImageUrl}
                  industry={company.industry}
                  tags={company.tags}
                  slug={company.name.toLowerCase().replace(/\s+/g, '-')}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}