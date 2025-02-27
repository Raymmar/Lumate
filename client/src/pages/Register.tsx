import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

interface PeopleResponse {
  people: Person[];
  total: number;
}

interface PersonResponse {
  person: Person;
}

// Form schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters" }).optional(),
  personId: z.string().min(1, { message: "Please select your Luma profile" })
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // Get email and personId from URL if available (from profile claim flow)
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  const personIdFromUrl = urlParams.get('personId');
  
  // Auto-fetch person data if email is from URL
  React.useEffect(() => {
    const autoFetchPerson = async () => {
      if (emailFromUrl) {
        setSearchEmail(emailFromUrl);
        
        if (emailFromUrl && personIdFromUrl) {
          setHasSearched(true);
          
          // Automatically fetch person data for the URL-provided email
          try {
            // Set custom query parameter to trigger refetch
            await refetchPerson();
            
            // If person data is found, pre-fill form fields
            if (personData?.person) {
              form.setValue('email', personData.person.email);
              form.setValue('personId', personData.person.id.toString());
              
              if (personData.person.userName) {
                form.setValue('displayName', personData.person.userName);
              } else if (personData.person.fullName) {
                form.setValue('displayName', personData.person.fullName);
              }
            }
          } catch (error) {
            console.error('Error auto-fetching person data:', error);
          }
        }
      }
    };
    
    autoFetchPerson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromUrl, personIdFromUrl]);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: emailFromUrl || '',
      displayName: '',
      personId: personIdFromUrl || ''
    },
  });

  // Query for finding a person by email
  const { 
    data: personData, 
    isLoading: isLoadingPerson, 
    error: personError,
    refetch: refetchPerson 
  } = useQuery<PersonResponse>({
    queryKey: ['/api/people/by-email', searchEmail],
    queryFn: async () => {
      if (!searchEmail) throw new Error('Email is required');
      const response = await fetch(`/api/people/by-email?email=${encodeURIComponent(searchEmail)}`);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    enabled: false // Don't run automatically
  });

  // Query to get all people for selecting
  const { 
    data: peopleData, 
    isLoading: isLoadingPeople 
  } = useQuery<PeopleResponse>({
    queryKey: ['/api/people'],
    queryFn: async () => {
      const response = await fetch('/api/people');
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  // Mutation for user registration
  const registerMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          displayName: data.displayName,
          personId: parseInt(data.personId)
        })
      });
      return response.json();
    },
    onSuccess: () => {
      setRegistrationComplete(true);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem with your registration. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle search form submission
  const handleSearch = async () => {
    if (!searchEmail) return;
    
    setHasSearched(true);
    try {
      await refetchPerson();
      
      // If person found, pre-fill the form
      if (personData?.person) {
        form.setValue('email', personData.person.email);
        form.setValue('personId', personData.person.id.toString());
        if (personData.person.userName) {
          form.setValue('displayName', personData.person.userName);
        }
      }
    } catch (error) {
      console.error('Error searching for person:', error);
    }
  };

  // Handle registration form submission
  const onSubmit = (data: FormValues) => {
    setIsRegistering(true);
    registerMutation.mutate(data);
  };

  // Show registration success message
  if (registrationComplete) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Registration Complete
            </CardTitle>
            <CardDescription>Your account has been created successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              We've sent a verification email to your address. Please check your inbox and click
              the verification link to complete the process.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            Join our community by linking your Luma profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSearched ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Step 1: Verify your email</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your email address to find your existing Luma profile.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={!searchEmail || isLoadingPerson}
                >
                  Search
                </Button>
              </div>
            </div>
          ) : (
            // Email search results
            <div className="space-y-6">
              {isLoadingPerson ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : personError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    We couldn't find an account with that email. Please check the email 
                    address or contact support if you believe this is an error.
                  </AlertDescription>
                </Alert>
              ) : personData?.person ? (
                // Person found, show registration form
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Step 2: Complete your registration</h3>
                      <p className="text-sm text-muted-foreground">
                        We found your Luma profile. Please confirm your details below.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            This is the email associated with your Luma profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="How you want to be known" />
                          </FormControl>
                          <FormDescription>
                            This name will be displayed in the community.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="personId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Luma Profile</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your Luma profile" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingPeople ? (
                                <SelectItem value="loading" disabled>Loading profiles...</SelectItem>
                              ) : (
                                peopleData?.people
                                  .filter(p => p.email.toLowerCase() === searchEmail.toLowerCase())
                                  .map((person) => (
                                    <SelectItem key={person.id} value={person.id.toString()}>
                                      {person.userName || person.fullName || person.email}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select your profile from our records.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isRegistering || registerMutation.isPending}
                    >
                      {isRegistering || registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="text-center py-4">
                  <p>No results found. Please try a different email address.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setHasSearched(false)} 
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          {hasSearched && (
            <Button 
              variant="ghost" 
              onClick={() => setHasSearched(false)}
            >
              Search Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}