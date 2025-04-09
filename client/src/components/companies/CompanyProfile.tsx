import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Users,
  Link as LinkIcon,
  Tag,
  Loader2
} from "lucide-react";
import { generateGoogleMapsUrl } from "@/lib/utils";
import { initGoogleMaps } from "@/lib/google-maps";
import { type Location } from "@shared/schema";

interface CompanyProfileProps {
  company: {
    id: number;
    name: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    phoneNumber: string | null;
    email: string | null;
    customLinks: string | null;
    [key: string]: any;
  };
  companySlug?: string;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company, companySlug }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      const result = await initGoogleMaps();
      setMapLoaded(result);
    };
    
    initMap();
  }, []);

  // Fetch company data by URL slug if we only have the companySlug
  const { data: companyData, isLoading, error } = useQuery({
    queryKey: ["/api/companies/slug", companySlug],
    queryFn: async () => {
      const response = await fetch(`/api/companies/slug/${companySlug}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load company profile");
      }
      return response.json();
    },
    enabled: !!companySlug && !company, // Only run the query if we have a slug but no company object
  });

  // If we're loading data based on slug
  if (companySlug && !company && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If we have an error fetching by slug
  if (companySlug && !company && error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Company Not Found</h3>
            <p className="text-muted-foreground">
              The company profile you're looking for doesn't exist or could not be loaded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use the directly passed company object or the one fetched by slug
  const displayCompany = company || (companyData?.company);
  
  if (!displayCompany) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Company Not Found</h3>
            <p className="text-muted-foreground">
              The company profile you're looking for doesn't exist or could not be loaded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const customLinks = Array.isArray(displayCompany.customLinks) 
    ? displayCompany.customLinks 
    : (typeof displayCompany.customLinks === 'string' && displayCompany.customLinks 
        ? JSON.parse(displayCompany.customLinks) 
        : []);
  
  // Parse address for map if it exists
  let addressObj: Location | null = null;
  if (displayCompany.address) {
    try {
      if (typeof displayCompany.address === 'string' && displayCompany.address.startsWith('{')) {
        addressObj = JSON.parse(displayCompany.address);
      } else if (typeof displayCompany.address === 'string') {
        addressObj = { address: displayCompany.address };
      } else if (typeof displayCompany.address === 'object') {
        addressObj = displayCompany.address;
      }
    } catch (e) {
      console.error("Failed to parse address:", e);
      addressObj = { address: displayCompany.address };
    }
  }

  const hasContactInfo = Boolean(
    displayCompany.phoneNumber || 
    displayCompany.email || 
    displayCompany.website ||
    addressObj
  );

  const hasAboutInfo = Boolean(
    displayCompany.description ||
    displayCompany.industry ||
    displayCompany.size ||
    displayCompany.founded
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        {displayCompany.featuredImageUrl && (
          <div className="relative h-48 w-full bg-muted">
            <img 
              src={displayCompany.featuredImageUrl} 
              alt={`${displayCompany.name} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={`${displayCompany.featuredImageUrl ? 'pt-6' : 'pt-8'} pb-6`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Avatar className="h-20 w-20 border">
              {displayCompany.logoUrl ? (
                <AvatarImage src={displayCompany.logoUrl} alt={displayCompany.name} />
              ) : (
                <AvatarFallback>
                  <Building2 className="h-10 w-10" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold">{displayCompany.name}</h1>
                  {displayCompany.industry && (
                    <p className="text-muted-foreground">{displayCompany.industry}</p>
                  )}
                </div>
                {displayCompany.tags && displayCompany.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {displayCompany.tags.map((tag: any, i: number) => (
                      <Badge variant="secondary" key={i}>{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {displayCompany.bio && (
                <p>{displayCompany.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Company Info */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="members">Team Members</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="space-y-6 pt-4">
              {hasAboutInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>About {displayCompany.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {displayCompany.description && (
                      <div>
                        <p className="whitespace-pre-wrap">{displayCompany.description}</p>
                      </div>
                    )}
                    
                    {(displayCompany.founded || displayCompany.size) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {displayCompany.founded && (
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Founded</p>
                              <p className="text-muted-foreground">{displayCompany.founded}</p>
                            </div>
                          </div>
                        )}
                        
                        {displayCompany.size && (
                          <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Company Size</p>
                              <p className="text-muted-foreground">{displayCompany.size}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Google Maps Embed */}
              {addressObj && mapLoaded && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Location</CardTitle>
                    <CardDescription>
                      {addressObj.formatted_address || addressObj.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 p-0 overflow-hidden">
                    <iframe 
                      title={`${displayCompany.name} location`}
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      src={`https://www.google.com/maps/embed/v1/place?q=${encodeURIComponent(addressObj.formatted_address || addressObj.address || '')}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
                      allowFullScreen 
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="members" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* We'll fetch and display team members in a future update */}
                  <p className="text-muted-foreground">
                    Team member information will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Contact & Links */}
        <div className="space-y-6">
          {hasContactInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {addressObj && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto p-3"
                    asChild
                  >
                    <a
                      href={generateGoogleMapsUrl(addressObj)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-left">
                        {addressObj.formatted_address || addressObj.address}
                      </span>
                    </a>
                  </Button>
                )}
                
                {displayCompany.isPhonePublic && displayCompany.phoneNumber && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={`tel:${displayCompany.phoneNumber}`}>
                      <Phone className="h-4 w-4" />
                      {displayCompany.phoneNumber}
                    </a>
                  </Button>
                )}
                
                {displayCompany.isEmailPublic && displayCompany.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a href={`mailto:${displayCompany.email}`}>
                      <Mail className="h-4 w-4" />
                      {displayCompany.email}
                    </a>
                  </Button>
                )}
                
                {displayCompany.website && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a 
                      href={displayCompany.website.startsWith('http') ? displayCompany.website : `https://${displayCompany.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4" />
                      {displayCompany.website.replace(/^https?:\/\//i, '')}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          
          {customLinks && customLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customLinks.map((link, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a 
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {link.title}
                    </a>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;