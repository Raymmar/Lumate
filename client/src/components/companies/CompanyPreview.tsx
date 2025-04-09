import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface CompanyPreviewProps {
  id: number;
  name: string;
  logoUrl: string | null;
  featuredImageUrl: string | null;
  industry: string | null;
  bio: string | null;
  tags: string[] | null;
  slug: string;
  className?: string;
}

export function CompanyPreview({ 
  name, 
  logoUrl, 
  featuredImageUrl, 
  industry, 
  bio,
  tags, 
  slug,
  className 
}: CompanyPreviewProps) {
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${className || ""}`}>
      <div className="relative h-32 w-full overflow-hidden bg-muted">
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
          <h3 className="font-semibold">{name}</h3>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-2">
        {industry && (
          <p className="text-sm text-muted-foreground">{industry}</p>
        )}
        {bio && (
          <p className="text-sm line-clamp-2">{bio}</p>
        )}
        <Link href={`/companies/${slug}`}>
          <Button variant="outline" size="sm" className="w-full">
            View full profile <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </Link>
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
  );
}