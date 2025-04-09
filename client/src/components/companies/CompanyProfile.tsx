import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Building, Calendar, Link as LinkIcon, Mail, MapPin, Phone, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

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

interface GeocodingResult {
  lat: number;
  lng: number;
}

export default function CompanyProfile({ nameSlug }: CompanyProfileProps) {
  const { toast } = useToast();
  const [coordinates, setCoordinates] = useState<GeocodingResult | null>(null);
  
  // Load Google Maps script
  const { isLoaded: isMapLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places'],
  });

  const { data: companyData, isLoading, error } = useQuery<{company: Company}>({
    queryKey: ['/api/companies/by-name', nameSlug],
    queryFn: async () => {
      const response = await fetch(`/api/companies/by-name/${encodeURIComponent(nameSlug)}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch company details: ${response.statusText}`);
      }

      return await response.json();
    }
  });

  const company = companyData?.company;

  // Lazy load map data only when the component is visible
  useEffect(() => {
    // Only load map data if the address exists and the map section is in viewport
    if (company?.address && isMapLoaded) {
      // Use a more efficient approach - lazy load the geocoding
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !coordinates) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: company.address }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                setCoordinates({
                  lat: location.lat(),
                  lng: location.lng()
                });
              }
              // Disconnect observer after first geocoding attempt
              observer.disconnect();
            });
          }
        });
      }, { threshold: 0.1 });
      
      // Target the map container for observation
      const mapElement = document.getElementById('company-map-container');
      if (mapElement) {
        observer.observe(mapElement);
      }
      
      return () => {
        observer.disconnect();
      };
    }
  }, [company, isMapLoaded, coordinates]);

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
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div>
            <Skeleton className="h-8 w-[300px] mb-4" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-12">Company not found</div>;
  }

  const defaultMapCenter = { lat: 27.3364, lng: -82.5308 }; // Default to Sarasota if geocoding fails

  return (
    <div className="w-full space-y-6">
      {/* Cover Image Banner */}
      <div className="relative w-full h-64 overflow-hidden rounded-lg bg-muted">
        {company.featuredImageUrl ? (
          <img 
            src={company.featuredImageUrl} 
            alt={`${company.name} cover`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/30 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary/50">
              {company.name || "Company Profile"}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent h-1/3" />
      </div>

      {/* Logo and Company Name */}
      <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12 md:-mt-16 px-4">
        <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-xl border-4 border-background shadow-md">
          {company.logoUrl ? (
            <AvatarImage src={company.logoUrl} alt={company.name || 'Company Logo'} />
          ) : (
            <AvatarFallback className="text-2xl md:text-3xl">
              {company.name
                ? company.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "?"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 pb-2">
          <h1 className="text-3xl font-bold mb-2">
            {company.name || "Unnamed Company"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {company.industry && (
              <Badge variant="secondary" className="text-sm">
                {company.industry}
              </Badge>
            )}
            {company.tags && company.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-8 md:grid-cols-3 w-full max-w-full">
        {/* Left: About section */}
        <div className="md:col-span-2 space-y-8">
          {/* Bio */}
          {company.bio && (
            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-sm md:prose-base max-w-none">
                  <p className="text-lg text-muted-foreground">{company.bio}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* About */}
          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle>About {company.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm md:prose-base max-w-none">
                  <p>{company.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Map */}
          {company.address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-muted-foreground">{company.address}</p>
                </div>
                <div id="company-map-container" className="aspect-video w-full overflow-hidden rounded-md border">
                  {isMapLoaded ? (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={coordinates || defaultMapCenter}
                      zoom={14}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        scrollwheel: false,
                      }}
                    >
                      {coordinates && <Marker position={coordinates} />}
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <p>Loading map...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Company details sidebar */}
        <div className="space-y-6">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.website && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {company.isEmailPublic && company.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {company.email}
                  </a>
                </div>
              )}
              
              {company.isPhonePublic && company.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <a 
                    href={`tel:${company.phoneNumber}`}
                    className="text-primary hover:underline"
                  >
                    {company.phoneNumber}
                  </a>
                </div>
              )}
              
              {company.founded && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span>Founded in {company.founded}</span>
                </div>
              )}

              {company.size && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span>{company.size} employees</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Links */}
          {company.customLinks && company.customLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.customLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <a 
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {link.title}
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CTA Button */}
          {company.ctaText && (
            <Link href="/contact">
              <Button className="w-full" size="lg">
                {company.ctaText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}