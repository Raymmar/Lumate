import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, User, UserPlus, Mail, Building, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  organizationName: string | null;
  jobTitle: string | null;
  bio: string | null;
}

interface User {
  id: number;
  email: string;
  displayName: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface ProfileResponse {
  user: User;
  person: Person;
}

interface PersonResponse {
  person: Person;
}

export default function Profile() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showClaimProfile, setShowClaimProfile] = useState(false);
  
  // Create a function that can be called both by button click and on mount
  const handleSearch = async (searchEmail = email) => {
    if (!searchEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to search for a profile.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    setShowClaimProfile(false);
    
    try {
      // First check if a user account exists
      await refetchProfile();
    } catch (error) {
      console.error('No user profile found, checking Luma data:', error);
      
      try {
        // If no user account, check if a Luma record exists
        await refetchPerson();
        setShowClaimProfile(true);
      } catch (error) {
        console.error('No Luma record found either:', error);
        toast({
          title: "No Record Found",
          description: "We couldn't find any profile with that email in our system.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  // First, try to find an existing user account for this email
  const {
    data: profileData,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery<ProfileResponse>({
    queryKey: ['/api/auth/profile', email],
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      const response = await fetch(`/api/auth/profile?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    enabled: false, // Don't run automatically
  });
  
  // If no user account exists, check if this email exists in Luma data
  const {
    data: personData,
    isLoading: isPersonLoading,
    error: personError,
    refetch: refetchPerson,
  } = useQuery<PersonResponse>({
    queryKey: ['/api/people/by-email', email],
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      const response = await fetch(`/api/people/by-email?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No Luma record found for this email");
        }
        throw new Error(response.statusText);
      }
      return response.json();
    },
    enabled: false, // Don't run automatically
  });
  
  // Extract email from URL query parameters if available
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // Automatically search if email is provided in URL
      handleSearch(emailParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
  
  // Button click handler that calls handleSearch
  const handleSearchClick = () => {
    handleSearch();
  };

  // Render initial search form
  if (!isSearching && !profileData) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Find Your Profile</CardTitle>
            <CardDescription>
              Enter your email address to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearchClick}>Search</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Button variant="ghost" onClick={() => navigate('/register')}>
              Register
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isProfileLoading || isPersonLoading || isSearching) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-4 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show the "Claim Profile" UI if a Luma record was found but no user account
  if (showClaimProfile && personData?.person && !profileData) {
    const person = personData.person;
    
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Claim Your Profile
            </CardTitle>
            <CardDescription>
              We found your Luma record! Create an account to claim your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <Avatar className="h-24 w-24">
                {person.avatarUrl ? (
                  <AvatarImage src={person.avatarUrl} alt={person.userName || "User"} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {person.userName || person.fullName
                    ? ((person.userName || person.fullName) || "")
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-md font-semibold">{person.userName || person.fullName || "Luma Member"}</h3>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                  {(person.organizationName || person.jobTitle) && (
                    <p className="text-sm text-muted-foreground">
                      {person.jobTitle && <span>{person.jobTitle}</span>}
                      {person.jobTitle && person.organizationName && <span> at </span>}
                      {person.organizationName && <span>{person.organizationName}</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Alert className="mb-6">
              <AlertTitle>Create Your Account</AlertTitle>
              <AlertDescription>
                Creating an account will allow you to access exclusive features and manage your profile.
                We'll send a verification email to confirm your identity.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => navigate(`/register?email=${encodeURIComponent(person.email)}&personId=${person.id}`)} 
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account and Claim Profile
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Button variant="ghost" onClick={() => {
              setEmail('');
              setIsSearching(false);
            }}>
              Try Different Email
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show error state when no profile or Luma record is found
  if ((profileError && !profileData) && (personError && !personData?.person)) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Profile Not Found
            </CardTitle>
            <CardDescription>
              We couldn't find any profile with that email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Not Found</AlertTitle>
              <AlertDescription>
                No account or Luma record exists for this email. Please check if you entered the correct email address.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button onClick={() => {
                setEmail('');
                setIsSearching(false);
              }} className="w-full">
                Try Another Email
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show profile data
  if (!profileData) {
    return null; // This should never happen, but TypeScript needs this check
  }
  
  const { user, person } = profileData;
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Your Profile</CardTitle>
            {user.isVerified ? (
              <span className="flex items-center text-green-600 text-sm font-medium">
                <CheckCircle className="h-4 w-4 mr-1" /> Verified
              </span>
            ) : (
              <span className="flex items-center text-amber-600 text-sm font-medium">
                <AlertCircle className="h-4 w-4 mr-1" /> Not Verified
              </span>
            )}
          </div>
          <CardDescription>
            Your personal information and linked Luma data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile image column */}
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24">
                {person.avatarUrl ? (
                  <AvatarImage src={person.avatarUrl} alt={user.displayName || 'User'} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {user.displayName
                    ? user.displayName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="mt-4 text-center">
                <h3 className="font-medium text-lg">{user.displayName || 'User'}</h3>
                {user.isVerified ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Verified Account
                  </span>
                ) : (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    Awaiting Verification
                  </span>
                )}
              </div>
            </div>

            {/* Profile details column */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-md font-semibold mb-2">Account Details</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Luma Username</p>
                      <p className="text-sm text-muted-foreground">{person.userName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-muted-foreground">{person.fullName || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold mb-2">Professional Information</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Organization</p>
                      <p className="text-sm text-muted-foreground">{person.organizationName || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Job Title</p>
                      <p className="text-sm text-muted-foreground">{person.jobTitle || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {person.bio && (
                <div>
                  <h3 className="text-md font-semibold mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{person.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
          <Button variant="ghost" onClick={() => {
            setEmail('');
            setIsSearching(false);
          }}>
            View Different Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}