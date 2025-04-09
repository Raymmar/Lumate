import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MapPin, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';

interface Company {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  industry: string | null;
  size: string | null;
  founded: string | null;
  bio: string | null;
  tags: string[] | null;
  isEmailPublic: boolean;
  isPhonePublic: boolean;
  ctaText: string | null;
  customLinks: Array<{ title: string; url: string; icon?: string }> | null;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = useQuery<{ companies: Company[] }>({
    queryKey: ['/api/companies'],
  });

  const companies = data?.companies || [];

  const filteredCompanies = companies.filter(company => {
    if (!debouncedSearch) return true;
    
    const searchLower = debouncedSearch.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      (company.industry && company.industry.toLowerCase().includes(searchLower)) ||
      (company.bio && company.bio.toLowerCase().includes(searchLower)) ||
      (company.address && company.address.toLowerCase().includes(searchLower))
    );
  });

  // Create a company URL slug
  const getCompanySlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">Company Directory</h1>
            <p className="text-muted-foreground">
              Explore businesses and organizations in our community
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies by name, industry, or location..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs defaultValue="grid" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <div className="text-sm text-muted-foreground">
                {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} found
              </div>
            </div>

            <TabsContent value="grid">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                      <CardContent className="p-4">
                        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCompanies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCompanies.map((company) => (
                    <a
                      key={company.id}
                      href={`/company/${getCompanySlug(company.name)}`}
                      className="block group"
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                        <div className="h-48 bg-gray-100 dark:bg-gray-800 relative">
                          {company.featuredImageUrl ? (
                            <img
                              src={company.featuredImageUrl}
                              alt={company.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building className="h-16 w-16 text-gray-400" />
                            </div>
                          )}
                          {company.logoUrl && (
                            <div className="absolute bottom-3 left-3 bg-background rounded shadow-lg p-1 w-12 h-12 flex items-center justify-center">
                              <img
                                src={company.logoUrl}
                                alt={`${company.name} logo`}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1">
                            {company.name}
                          </h3>
                          {company.industry && (
                            <Badge variant="secondary" className="mb-2">
                              {company.industry}
                            </Badge>
                          )}
                          {company.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {company.bio}
                            </p>
                          )}
                          {company.address && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate">{company.address}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No companies found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="list">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex items-center">
                        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mr-4" />
                        <div className="flex-1">
                          <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCompanies.length > 0 ? (
                <div className="space-y-4">
                  {filteredCompanies.map((company) => (
                    <a
                      key={company.id}
                      href={`/company/${getCompanySlug(company.name)}`}
                      className="block group"
                    >
                      <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4 flex items-center">
                          <div className="flex-shrink-0 mr-4">
                            <div className="h-12 w-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                              {company.logoUrl ? (
                                <img
                                  src={company.logoUrl}
                                  alt={`${company.name} logo`}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Building className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                              {company.name}
                            </h3>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              {company.industry && (
                                <Badge variant="secondary" className="text-xs">
                                  {company.industry}
                                </Badge>
                              )}
                              {company.address && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span className="truncate">{company.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No companies found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}