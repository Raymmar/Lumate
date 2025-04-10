import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Building, Calendar, Link as LinkIcon, Mail, MapPin, Phone, UserCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { formatUsernameForUrl } from '@/lib/utils';

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

interface GoogleMapAddress {
  city?: string;
  region?: string;
  address?: string;
  country?: string;
  placeId?: string;
  latitude?: string;
  longitude?: string;
  formatted_address?: string;
}

interface CompanyMember {
  id: number;
  companyId: number;
  userId: number;
  role: string;
  title: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isVerified: boolean;
    person?: {
      id: number;
      api_id: string;
      userName: string | null;
      fullName: string | null;
      jobTitle: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export default function CompanyProfile({ nameSlug }: CompanyProfileProps) {
  const { toast } = useToast();
  const [coordinates, setCoordinates] = useState<GeocodingResult | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  
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
  
  // Fetch company members when we have the company id
  const { data: membersData, isLoading: isLoadingMembers, error: membersError } = useQuery<{members: CompanyMember[]}>({
    queryKey: ['/api/companies', company?.id, 'members'],
    queryFn: async () => {
      if (!company) {
        console.log('No company data available yet');
        return { members: [] };
      }
      
      console.log(`Fetching members for company ID: ${company.id}`);
      try {
        const response = await fetch(`/api/companies/${company.id}/members`);
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching company members: ${errorText || response.statusText}`);
          throw new Error(`Failed to fetch company members: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Company members data:', result);
        
        if (!result.members || !Array.isArray(result.members)) {
          console.error('Unexpected response format:', result);
          return { members: [] };
        }
        
        console.log(`Found ${result.members.length} members for company ID ${company.id}`);
        
        return result;
      } catch (error) {
        console.error('Error in members fetch query:', error);
        throw error;
      }
    },
    enabled: !!company, // Only run this query when we have a company
  });

  // Parse address from Google Maps JSON if needed
  useEffect(() => {
    if (company?.address) {
      try {
        // Check if the address is a JSON string
        if (typeof company.address === 'string' && company.address.startsWith('{')) {
          const addressObj = JSON.parse(company.address) as GoogleMapAddress;
          // Use formatted_address or address field from the JSON
          if (addressObj.formatted_address) {
            setFormattedAddress(addressObj.formatted_address);
          } else if (addressObj.address) {
            setFormattedAddress(addressObj.address);
          } else {
            setFormattedAddress(company.address);
          }
          
          // If we have latitude/longitude in the JSON, set coordinates directly
          if (addressObj.latitude && addressObj.longitude) {
            setCoordinates({
              lat: parseFloat(addressObj.latitude),
              lng: parseFloat(addressObj.longitude)
            });
          }
        } else {
          // Not JSON, use as is
          setFormattedAddress(company.address);
        }
      } catch (error) {
        // If JSON parsing fails, use the address as is
        console.error("Error parsing address JSON:", error);
        setFormattedAddress(company.address);
      }
    }
  }, [company?.address]);

  // Lazy load map data only when the component is visible
  useEffect(() => {
    // Only load map data if the address exists, we don't have coordinates yet, and the map section is in viewport
    if (company?.address && isMapLoaded && !coordinates) {
      // Use a more efficient approach - lazy load the geocoding
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !coordinates) {
            const geocoder = new google.maps.Geocoder();
            // Use the formatted address for geocoding if available, otherwise use raw address
            const addressToGeocode = formattedAddress || company.address;
            geocoder.geocode({ address: addressToGeocode }, (results, status) => {
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
  }, [company, isMapLoaded, coordinates, formattedAddress]);

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
    <div className="w-full space-y-4">
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

      {/* Main content */}
      <div className="grid gap-4 md:grid-cols-3 w-full max-w-full">
        {/* Left: About section */}
        <div className="md:col-span-2 space-y-4">
          {/* Company Name and Bio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl">{company.name || "Unnamed Company"}</CardTitle>
            </CardHeader>
            {company.bio && (
              <CardContent>
                <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                  <p className="text-muted-foreground">{company.bio}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Company Description */}
          {company.description && (
            <Card>
              <CardContent className="py-4">
                <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                  <p>{company.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Map */}
          {company.address && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <p className="text-muted-foreground">{formattedAddress || company.address}</p>
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
        <div className="space-y-3">
          {/* CTA Button (moved to top) */}
          {company.website && (
            <div className="mb-0">
              <a 
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="w-full">
                  {company.ctaText || "Visit Website"}
                </Button>
              </a>
            </div>
          )}
          
          {/* Company Info Card */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle>Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-primary hover:underline truncate"
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
                    className="text-primary hover:underline"
                  >
                    {company.phoneNumber}
                  </a>
                </div>
              )}
              
              {company.founded && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Founded in {company.founded}</span>
                </div>
              )}

              {company.size && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{company.size}</span>
                </div>
              )}
              
              {company.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{company.industry}</span>
                </div>
              )}
              
              {/* Tags */}
              {company.tags && company.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                  {company.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Links */}
          {company.customLinks && company.customLinks.length > 0 && (
            <Card className="pt-4">
              <CardContent className="space-y-2">
                {company.customLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
          
          {/* Company Members */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingMembers ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : membersData?.members && membersData.members.length > 0 ? (
                <div className="space-y-1">
                  {membersData.members
                    .filter(member => member.isPublic)
                    .map((member) => {
                      const userName = member.user.displayName || member.user.email.split('@')[0];
                      const jobTitle = member.title || member.user.person?.jobTitle || '';
                      
                      // Create avatar initials
                      const initials = userName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                        
                      // Generate profile path
                      const profilePath = member.user.person ? 
                        `/people/${formatUsernameForUrl(member.user.person.userName, member.user.person.api_id)}` : 
                        null;
                      
                      if (!profilePath) return null;
                        
                      return (
                        <Link key={member.id} href={profilePath}>
                          <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                            <Avatar className="h-8 w-8">
                              {member.user.person?.avatarUrl ? (
                                <AvatarImage 
                                  src={member.user.person.avatarUrl} 
                                  alt={userName} 
                                />
                              ) : (
                                <AvatarFallback className="text-sm">
                                  {initials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-sm font-medium truncate">{userName}</div>
                              {jobTitle && (
                                <div className="text-xs text-muted-foreground truncate">{jobTitle}</div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team members listed</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}