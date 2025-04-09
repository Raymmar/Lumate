import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

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
  id,
  name,
  logoUrl,
  featuredImageUrl,
  industry,
  tags,
  slug
}: CompanyCardProps) {
  
  return (
    <Link href={`/companies/${slug}`} className="card-link">
      <Card className="h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          {featuredImageUrl ? (
            <img
              src={featuredImageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={name} 
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <Building2 className="h-20 w-20 text-muted-foreground/40" />
              )}
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <h3 className="line-clamp-1 text-xl font-semibold">{name}</h3>
          {industry && (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {industry}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {/* The company description could go here */}
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-2 pb-4">
          {tags && tags.length > 0 ? (
            tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
          
          {tags && tags.length > 3 && (
            <Badge variant="outline">+{tags.length - 3} more</Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}