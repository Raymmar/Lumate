import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Building, Link as LinkIcon, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface CompanyProfileProps {
  nameSlug: string;
}

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

export default function CompanyProfile({ nameSlug }: CompanyProfileProps) {
  const { toast } = useToast();

  const { data: companyData, isLoading, error } = useQuery<{company: Company}>({
    queryKey: ['/api/companies/by-name', nameSlug],
    queryFn: async () => {
      console.log('Fetching company details for slug:', nameSlug);
      const response = await fetch(`/api/companies/by-name/${encodeURIComponent(nameSlug)}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch company details:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          nameSlug
        });
        throw new Error(`Failed to fetch company details: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched company details:', data);
      return data;
    }
  });

  const company = companyData?.company;

  if (error) {
    console.error('Error in CompanyProfile:', error);
    return (
      <div className="rounded-lg border bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load company profile details. Please try again later.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!company) {
    return <div>Company not found</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 w-full max-w-full">
      <div className="md:col-span-2 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-20 w-20 flex-shrink-0">
              {company.logoUrl ? (
                <AvatarImage src={company.logoUrl} alt={company.name || 'Company Logo'} />
              ) : (
                <AvatarFallback className="text-xl">
                  {company.name
                    ? company.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold mb-2 truncate">
                {company.name || "Unnamed Company"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {company.industry && (
                  <Badge variant="secondary" className="truncate max-w-full">
                    {company.industry}
                  </Badge>
                )}
                {company.size && (
                  <Badge variant="outline" className="truncate max-w-full">
                    {company.size}
                  </Badge>
                )}
                {company.tags && company.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="truncate max-w-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {company.bio && (
          <Card className="overflow-hidden">
            <CardContent className="py-4 pt-4">
              <p className="text-lg text-muted-foreground break-words">{company.bio}</p>
            </CardContent>
          </Card>
        )}

        {company.description && (
          <Card className="overflow-hidden">
            <CardContent className="py-4 pt-4">
              <h3 className="text-lg font-medium mb-2">About</h3>
              <div className="prose max-w-none text-muted-foreground">
                <p>{company.description}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="w-full">
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-4">
              {company.founded && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Founded in {company.founded}</span>
                </div>
              )}
              
              {company.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {company.isEmailPublic && company.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {company.email}
                  </a>
                </div>
              )}
              
              {company.isPhonePublic && company.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a 
                    href={`tel:${company.phoneNumber}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {company.phoneNumber}
                  </a>
                </div>
              )}
              
              {company.address && (
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{company.address}</span>
                </div>
              )}
            </div>

            {company.customLinks && company.customLinks.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium">Links</h3>
                {company.customLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a 
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate"
                    >
                      {link.title}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {company.ctaText && (
              <div className="border-t pt-4">
                <Link href="/contact">
                  <Button className="w-full">{company.ctaText}</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}