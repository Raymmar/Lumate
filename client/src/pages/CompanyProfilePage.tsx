import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, MapPin, Phone, Mail, Globe, Building, 
  Calendar, Share2, ClipboardCopy, Check 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { initGoogleMaps, isGoogleMapsLoaded } from "@/lib/google-maps";
import { type Location } from "@shared/schema";
import { getGeocode, getLatLng } from "use-places-autocomplete";

interface CompanyData {
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

interface Member {
  id: number;
  userId: number;
  companyId: number;
  role: string;
  title: string | null;
  isPublic: boolean;
  addedBy: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    featuredImageUrl: string | null;
  };
}

export default function CompanyProfile() {
  const { companyName } = useParams();
  const { user } = useAuth();
  const [showCopied, setShowCopied] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<CompanyData | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 27.336, lng: -82.538 }); // Sarasota default
  const [isGeocodingStarted, setIsGeocodingStarted] = useState(false);

  // Decode the companyName from URL
  const decodedCompanyName = companyName ? decodeURIComponent(companyName) : '';

  // Directly fetch the company by its ID or name from the URL
  const { data: companyData, isLoading: isLoadingCompany } = useQuery<{ company: CompanyData }>({
    queryKey: ['/api/companies', decodedCompanyName],
  });

  // Extract the company from the response
  const company = companyData?.company;

  // Fetch company members if we have a company
  const { data: membersData, isLoading: isLoadingMembers } = useQuery<{ members: Member[] }>({
    queryKey: ['/api/companies', decodedCompanyName, 'members'],
    enabled: !!decodedCompanyName,
  });
  
  // Extract members from the response
  const members = membersData?.members || [];

  const isLoading = isLoadingCompany || isLoadingMembers;
  const error = !company && !isLoadingCompany;

  // Load Google Maps
  useEffect(() => {
    const initMaps = async () => {
      await initGoogleMaps();
      setMapLoaded(true);
    };
    initMaps();
  }, []);

  // Geocode the address when company data and maps are loaded
  useEffect(() => {
    const geocodeAddress = async () => {
      if (
        company?.address && 
        mapLoaded && 
        isGoogleMapsLoaded() && 
        !isGeocodingStarted
      ) {
        setIsGeocodingStarted(true);
        try {
          const results = await getGeocode({ address: company.address });
          const { lat, lng } = await getLatLng(results[0]);
          setMapCenter({ lat, lng });
        } catch (error) {
          console.error("Error geocoding address:", error);
          // Fallback to default coordinates
          setMapCenter({ lat: 27.336, lng: -82.538 });
        }
      }
    };
    
    geocodeAddress();
  }, [company, mapLoaded, isGeocodingStarted]);

  const copyProfileLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Company profile link copied to clipboard',
    });
  };

  const onMapLoad = React.useCallback(() => {
    setMapLoaded(true);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <div className="container max-w-6xl py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Company profile not found or there was an error loading it.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Check if current user is a member/admin of this company
  const userIsMember = members?.some(member => member.user.id === user?.id);
  const userIsAdmin = members?.some(member => member.user.id === user?.id && member.role === 'admin');

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.5rem'
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        {/* Company Header */}
        <div className="relative mb-8">
          {company.featuredImageUrl && (
            <div className="relative h-64 rounded-lg overflow-hidden mb-6">
              <img
                src={company.featuredImageUrl}
                alt={`${company.name} featured image`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={`${company.name} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold">{company.name}</h1>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyProfileLink}
                    className="flex gap-1 items-center"
                  >
                    {showCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Share
                      </>
                    )}
                  </Button>
                  
                  {userIsAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex gap-1 items-center"
                      onClick={() => window.location.href = `/company/profile/edit/${company.id}`}
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              {company.industry && (
                <div className="mb-2">
                  <Badge variant="secondary">{company.industry}</Badge>
                  {company.size && <Badge variant="outline" className="ml-2">{company.size}</Badge>}
                  {company.founded && <Badge variant="outline" className="ml-2">Founded {company.founded}</Badge>}
                </div>
              )}

              {company.bio && (
                <p className="text-muted-foreground mb-4 max-w-3xl">
                  {company.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mb-4">
                {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                
                {company.address && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4" />
                    {company.address}
                  </div>
                )}
                
                {company.phoneNumber && company.isPhonePublic && (
                  <a 
                    href={`tel:${company.phoneNumber}`} 
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {company.phoneNumber}
                  </a>
                )}
                
                {company.email && company.isEmailPublic && (
                  <a 
                    href={`mailto:${company.email}`} 
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {company.email}
                  </a>
                )}
              </div>

              {company.tags && company.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {company.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {company.ctaText && company.website && (
                <div className="mt-4">
                  <Button 
                    asChild 
                    className="mt-2"
                    size="sm"
                  >
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {company.ctaText}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="about" className="space-y-4">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            {company.address && <TabsTrigger value="location">Location</TabsTrigger>}
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About {company.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {company.description ? (
                  <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: company.description }} />
                ) : (
                  <p className="text-muted-foreground">No detailed description available.</p>
                )}

                {company.customLinks && company.customLinks.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-3">Links</h3>
                      <div className="flex flex-wrap gap-3">
                        {company.customLinks.map((link, index) => (
                          <Button 
                            key={index} 
                            variant="outline" 
                            asChild
                          >
                            <a 
                              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              {link.title}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {members && members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members
                      .filter(member => member.isPublic)
                      .map((member) => (
                        <a 
                          key={member.id} 
                          href={`/profile/${member.user.id}`}
                          className="block group"
                        >
                          <div className="flex items-center p-3 rounded-lg border group-hover:border-primary transition-colors">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mr-3 flex-shrink-0">
                              {member.user.featuredImageUrl ? (
                                <img 
                                  src={member.user.featuredImageUrl} 
                                  alt={member.user.displayName || 'Member'} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  {(member.user.displayName?.charAt(0) || '?').toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium group-hover:text-primary transition-colors">
                                {member.user.displayName || member.user.email}
                              </h3>
                              {member.title && (
                                <p className="text-sm text-muted-foreground">{member.title}</p>
                              )}
                              {member.role === 'admin' && (
                                <Badge variant="outline" className="mt-1">Admin</Badge>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No team members to display.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {company.address && (
            <TabsContent value="location" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-lg font-medium">{company.name}</p>
                    <p className="text-muted-foreground">{company.address}</p>
                  </div>
                  
                  {/* Google Map Integration */}
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={15}
                    onLoad={onMapLoad}
                  >
                    {mapLoaded && (
                      <Marker 
                        position={mapCenter}
                        onClick={() => setSelectedMarker(company)}
                      />
                    )}
                    
                    {selectedMarker && (
                      <InfoWindow
                        position={mapCenter}
                        onCloseClick={() => setSelectedMarker(null)}
                      >
                        <div>
                          <h3 className="font-medium">{company.name}</h3>
                          <p className="text-sm">{company.address}</p>
                          {company.website && (
                            <a 
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline block mt-1"
                            >
                              Visit Website
                            </a>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}