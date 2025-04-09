import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import { Link } from "wouter";

interface CompanyCardProps {
  id: number;
  name: string;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  industry: string | null;
  tags: string[] | null;
  slug: string;
}

export function CompanyCard({ 
  name, 
  logoUrl, 
  featuredImageUrl, 
  industry, 
  tags, 
  slug 
}: CompanyCardProps) {
  return (
    <Link href={`/companies/${slug}`}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md cursor-pointer">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {featuredImageUrl ? (
            <img 
              src={featuredImageUrl} 
              alt={`${name}`} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-primary/10 to-primary/30 flex items-center justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={name} 
                  className="max-h-16 max-w-16"
                />
              ) : (
                <Building className="h-12 w-12 text-primary/50" />
              )}
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <div className="h-8 w-8 shrink-0 rounded-full bg-muted overflow-hidden">
                <img 
                  src={logoUrl} 
                  alt={name} 
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <h3 className="font-semibold truncate">{name}</h3>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2">
          {industry && (
            <p className="text-sm text-muted-foreground">{industry}</p>
          )}
        </CardContent>
        
        {tags && tags.length > 0 && (
          <CardFooter>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}