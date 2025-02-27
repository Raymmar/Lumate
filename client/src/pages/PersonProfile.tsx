import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Calendar, Briefcase, Building, MessageSquare, Check, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
  person: Person;
  user?: User;
}

// Schema for claiming a profile
const claimProfileSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ClaimProfileFormValues = z.infer<typeof claimProfileSchema>;

export default function PersonProfile() {
  const [, params] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  
  // Extract personId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  const personEmail = urlParams.get('email');
  
  if (!personId && !personEmail) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              The requested profile could not be found. Please go back to the directory.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </CardFooter>
        </Card>
      </DashboardLayout>
    );
  }

  // Fetch person profile data
  const { data, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['/api/people/profile', personId, personEmail],
    queryFn: async () => {
      const params = personId 
        ? `id=${personId}` 
        : `email=${encodeURIComponent(personEmail as string)}`;
      
      const response = await fetch(`/api/people/profile?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Profile not found');
        }
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    }
  });

  // Form for claiming profile
  const form = useForm<ClaimProfileFormValues>({
    resolver: zodResolver(claimProfileSchema),
    defaultValues: {
      email: data?.person.email || ''
    }
  });

  // Mutation for claiming profile
  const claimProfile = useMutation({
    mutationFn: async (data: ClaimProfileFormValues) => {
      return apiRequest(`/api/auth/claim-profile`, {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          personId: personId || data?.person.id
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify and claim your profile.",
      });
      setEmailSent(true);
    },
    onError: (error) => {
      toast({
        title: "Failed to send verification email",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: ClaimProfileFormValues) => {
    claimProfile.mutate(values);
  };

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load profile data"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </CardFooter>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[350px] mt-2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="space-y-4 flex-1">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : data?.person ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{data.person.fullName || data.person.userName || "Anonymous"}</CardTitle>
                  <CardDescription>{data.person.email}</CardDescription>
                </div>
                {data.user && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-500">
                    <Check className="h-3 w-3 mr-1" /> Verified Member
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <Avatar className="h-32 w-32">
                  {data.person.avatarUrl ? (
                    <AvatarImage src={data.person.avatarUrl} alt={data.person.userName || "User"} />
                  ) : null}
                  <AvatarFallback className="text-2xl">
                    {data.person.userName || data.person.fullName
                      ? ((data.person.userName || data.person.fullName) || "")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{data.person.email}</span>
                    </div>
                    
                    {data.person.organizationName && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{data.person.organizationName}</span>
                      </div>
                    )}
                    
                    {data.person.jobTitle && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{data.person.jobTitle}</span>
                      </div>
                    )}
                  </div>
                  
                  {data.person.bio && (
                    <div className="pt-4">
                      <h3 className="text-sm font-medium mb-2">Bio</h3>
                      <p className="text-sm text-muted-foreground">{data.person.bio}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Account Status Section */}
              {!data.user ? (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Claim Your Profile</h3>
                  {emailSent ? (
                    <div className="text-center py-6">
                      <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
                      <h3 className="text-lg font-medium">Verification Email Sent!</h3>
                      <p className="mt-2 text-muted-foreground">
                        We've sent a verification link to your email address. 
                        Please check your inbox and click the link to claim your profile.
                      </p>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormDescription>
                                Enter the email associated with this profile to claim it
                              </FormDescription>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="your.email@example.com" 
                                  defaultValue={data.person.email}
                                  disabled={claimProfile.isPending}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={claimProfile.isPending}
                        >
                          {claimProfile.isPending ? "Sending..." : "Verify & Claim Profile"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
                    <h3 className="text-lg font-medium">Verified Account</h3>
                  </div>
                  <p className="text-muted-foreground">
                    This profile has been claimed and verified by {data.user.displayName || data.user.email}.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Account created on {new Date(data.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              The requested profile could not be found. Please go back to the directory.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </CardFooter>
        </Card>
      )}
    </DashboardLayout>
  );
}