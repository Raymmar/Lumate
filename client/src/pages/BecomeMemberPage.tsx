import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Building, Building2, InfoIcon } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function BecomeMemberPage() {
  const [email, setEmail] = useState("");
  const [premiumEmail, setPremiumEmail] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [isDirectUpgradeLoading, setIsDirectUpgradeLoading] = useState(false);
  const [isCompanyUpgradeLoading, setIsCompanyUpgradeLoading] = useState(false);
  
  // Helper function to validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Fetch featured event for invitation
  const { data: featuredEvent } = useQuery({
    queryKey: ["/api/events/featured"],
    queryFn: async () => {
      const response = await fetch("/api/events/featured");
      if (!response.ok) {
        throw new Error("Failed to fetch featured event");
      }
      return response.json();
    },
  });

  const claimProfileMutation = useMutation({
    mutationFn: async (data: { email: string; personId?: string }) => {
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok && !responseData.status) {
        throw new Error(responseData.error || 'Failed to claim profile');
      }
      return responseData;
    },
    onSuccess: (data) => {
      if (data.status === 'invited') {
        toast({
          title: "Invitation Sent",
          description: (
            <>
              {data.message}
              {data.nextEvent?.url && (
                <div className="mt-2">
                  <a 
                    href={data.nextEvent.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Click here to view the event details
                  </a>
                </div>
              )}
            </>
          ),
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email to verify your profile claim.",
        });
      }
      setEmail('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    claimProfileMutation.mutate({ email });
  };
  
  const handleUpgrade = async () => {
    try {
      setIsUpgradeLoading(true);
      
      // Redirect to login if user is not authenticated
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in or claim your profile before upgrading to premium.",
        });
        setIsUpgradeLoading(false);
        return;
      }
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process upgrade",
        variant: "destructive",
      });
      setIsUpgradeLoading(false);
    }
  };
  
  // Direct checkout flow for non-logged in users
  const handleDirectUpgrade = async () => {
    try {
      if (!premiumEmail || !isValidEmail(premiumEmail)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address to continue.",
          variant: "destructive",
        });
        return;
      }
      
      setIsDirectUpgradeLoading(true);
      
      // Call the direct checkout endpoint
      const response = await fetch('/api/stripe/create-direct-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: premiumEmail.trim().toLowerCase(),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (error.error === "Account already exists") {
          toast({
            title: "Account Already Exists",
            description: "Please log in with your existing account to upgrade to premium.",
            variant: "destructive",
          });
        } else {
          throw new Error(error.message || 'Failed to create checkout session');
        }
        setIsDirectUpgradeLoading(false);
        return;
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Direct upgrade error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process premium upgrade",
        variant: "destructive",
      });
      setIsDirectUpgradeLoading(false);
    }
  };
  
  const handleCompanyUpgrade = async () => {
    try {
      setIsCompanyUpgradeLoading(true);
      
      // Redirect to login if user is not authenticated
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in or claim your profile before upgrading to a company account.",
        });
        setIsCompanyUpgradeLoading(false);
        return;
      }
      
      // Create checkout session for company tier
      const response = await fetch('/api/stripe/create-company-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Company upgrade error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process company upgrade",
        variant: "destructive",
      });
      setIsCompanyUpgradeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <PageContainer>
          <NavBar />
        </PageContainer>
      </div>
      
      <PageContainer className="flex-1 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-center">Become a Member</h1>
          <p className="text-center text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join our growing tech community! Whether you're claiming your existing profile or upgrading to premium, 
            we're excited to have you as part of our network.
          </p>
          
          {/* Instruction callout */}
          <Alert className="mb-8 max-w-3xl mx-auto bg-muted/50">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>How to join Sarasota Tech</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>If you've attended our events, claim your free profile by entering your email below.</li>
                <li>Check your inbox for a verification link and set up your account.</li>
                <li>Upgrade to premium or company membership for additional features anytime.</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          {/* Membership options - 3 columns on large screens, 1 column on small */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Free Membership */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  Free Membership
                </CardTitle>
                <CardDescription>
                  Claim your free profile and join the community
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="list-disc pl-5 space-y-2 mb-6">
                  <li>Create and customize your member profile</li>
                  <li>Connect with local tech professionals</li>
                  <li>Discover and RSVP to community events</li>
                  <li>Access to the member directory</li>
                  <li>Receive community updates</li>
                </ul>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={claimProfileMutation.isPending}
                  className="w-full"
                >
                  {claimProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Claim Your Profile"
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Premium Membership */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Premium Membership
                </CardTitle>
                <CardDescription>
                  Upgrade to premium for enhanced features
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="list-disc pl-5 space-y-2 mb-6">
                  <li>All features of free membership</li>
                  <li>Create and manage your company profile</li>
                  <li>Showcase your company on the member directory</li>
                  <li>Enhanced member profile visibility</li>
                  <li>Early access to new features</li>
                  <li>Priority support</li>
                </ul>
                
                {!user && (
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="premium-email">Your Email</Label>
                      <Input
                        id="premium-email"
                        type="email"
                        value={premiumEmail}
                        onChange={(e) => setPremiumEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Join as a premium member! After payment, you'll complete your profile setup.
                    </div>
                  </form>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                {user ? (
                  <Button 
                    className="w-full bg-[#FEA30E] hover:bg-[#FEA30E]/90 text-black"
                    onClick={handleUpgrade}
                    disabled={isUpgradeLoading}
                  >
                    {isUpgradeLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upgrade to Premium ($25/month)"
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-[#FEA30E] hover:bg-[#FEA30E]/90 text-black"
                    onClick={handleDirectUpgrade}
                    disabled={isDirectUpgradeLoading || !premiumEmail || !isValidEmail(premiumEmail)}
                  >
                    {isDirectUpgradeLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upgrade Directly ($25/month)"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
            
            {/* Company Account */}
            <Card className="flex flex-col">
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Coming Soon
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Company Account
                </CardTitle>
                <CardDescription>
                  Create a multi-user company profile
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="list-disc pl-5 space-y-2 mb-6">
                  <li>All features of premium membership</li>
                  <li>Add up to 5 team members to your company</li>
                  <li>Team collaboration tools</li>
                  <li>Company analytics dashboard</li>
                  <li>Featured placement opportunities</li>
                  <li>Dedicated account manager</li>
                </ul>
                
                <div className="mt-4 text-sm text-muted-foreground italic">
                  Company accounts will be available soon. Join our premium membership first to get early access.
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  className="w-full opacity-60 cursor-not-allowed"
                  variant="secondary"
                  disabled
                >
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Corporate Sponsorships - Full width */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-center">Corporate Sponsorships</CardTitle>
              <CardDescription className="text-center">
                Support the Sarasota tech ecosystem and gain exclusive benefits for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-3xl mx-auto">
              <p className="mb-4">
                Our corporate sponsorships provide high-visibility opportunities and direct engagement with the local tech community.
                Sponsors receive premium placement at events, featured content in our newsletter, and custom partnership opportunities.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
                <Button asChild>
                  <Link href="mailto:sponsorships@sarasotatech.org">Contact About Sponsorships</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/about">Learn More About Our Community</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}