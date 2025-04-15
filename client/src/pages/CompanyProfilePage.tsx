import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Plus,
  X,
  Building2,
  AlertCircle,
  Globe,
  Mail,
  Phone,
  Lock,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Command, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { TagSelector } from "@/components/ui/tag-selector";
import { cn, formatCompanyNameForUrl } from "@/lib/utils";
import { type UserCustomLink } from "@shared/schema";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Monitor } from "lucide-react";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as z from "zod";

// Industry options
const INDUSTRY_OPTIONS = [
  // Tech-focused industries
  "Software Development",
  "IT Services & Consulting",
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Data & Analytics",
  "Web Development",
  "Mobile Development",
  "Digital Marketing",
  "E-commerce",
  "EdTech",
  "FinTech",
  "HealthTech",
  "Telecommunications",
  
  // Other major industries
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Construction",
  "Energy",
  "Transportation",
  "Hospitality & Tourism",
  "Media & Entertainment",
  "Legal Services",
  "Consulting",
  "Non-profit",
  "Other"
];

// Company size options
const COMPANY_SIZE_OPTIONS = [
  "1-5",
  "5-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+"
];

// Founded year options (current year down to 1900)
const FOUNDED_YEAR_OPTIONS = Array.from({ length: 126 }, (_, i) => (2025 - i).toString());

// Company profile form schema
const companyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional().nullable(),
  website: z.string().url("Invalid website URL").optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  founded: z.string().optional().nullable(),
  featuredImageUrl: z.string().optional().nullable(),
  bio: z.string().max(300, "Bio must be less than 300 characters").optional().nullable(),
  isPhonePublic: z.boolean().default(false),
  isEmailPublic: z.boolean().default(false),
  ctaText: z.string().optional().nullable(),
  customLinks: z.array(
    z.object({
      title: z.string(),
      url: z.string().url("Invalid URL"),
      icon: z.string().optional(),
    })
  ).default([]),
  tags: z.array(z.string()).default([]),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [tags, setTags] = useState<string[]>([]);
  const [customLinks, setCustomLinks] = useState<UserCustomLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Check subscription status
  const { data: subscriptionStatus, isLoading: isSubscriptionLoading } =
    useQuery({
      queryKey: ["/api/subscription/status"],
      queryFn: async () => {
        const response = await fetch("/api/subscription/status");
        if (!response.ok)
          throw new Error("Failed to check subscription status");
        return response.json();
      },
      enabled: !!user,
    });

  const hasActiveSubscription =
    user?.isAdmin || subscriptionStatus?.status === "active";

  // Start subscription function
  const startSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error("No checkout URL received");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to initialize subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    initGoogleMaps();
  }, []);

  // Fetch company data
  const { data: userCompanies, isLoading: isCompaniesLoading } = useQuery({
    queryKey: ["/api/companies/user/companies"],
    queryFn: async () => {
      const response = await fetch("/api/companies/user/companies");
      if (!response.ok) {
        throw new Error("Failed to fetch user's companies");
      }
      return await response.json();
    },
    enabled: !!user,
  });

  // For simplicity, we'll work with the first company found for this user
  const company = userCompanies?.companies?.[0];
  // Check if user is a company admin or has system admin privileges
  const isCompanyAdmin = company?.role === 'admin' || user?.isAdmin === true;
  
  // Determine if user can edit the company profile - any member of the company can edit (not just admins)
  const canEditCompany = company !== undefined || user?.isAdmin === true;
  
  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      logoUrl: "",
      address: "",
      phoneNumber: "",
      email: "",
      industry: "",
      size: "",
      founded: "",
      featuredImageUrl: "",
      bio: "",
      isPhonePublic: false,
      isEmailPublic: false,
      ctaText: "",
      customLinks: [],
      tags: [],
    },
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  // Update form values when company data is loaded
  useEffect(() => {
    if (company) {
      let parsedCustomLinks: UserCustomLink[] = [];
      
      try {
        if (typeof company.customLinks === 'string') {
          parsedCustomLinks = JSON.parse(company.customLinks);
        } else if (Array.isArray(company.customLinks)) {
          parsedCustomLinks = company.customLinks;
        }
      } catch (e) {
        console.error("Failed to parse custom links:", e);
      }
      
      form.reset({
        name: company.name || "",
        description: company.description || "",
        website: company.website || "",
        logoUrl: company.logoUrl || "",
        address: company.address || "",
        phoneNumber: company.phoneNumber || "",
        email: company.email || "",
        industry: company.industry || "",
        size: company.size || "",
        founded: company.founded || "",
        featuredImageUrl: company.featuredImageUrl || "",
        bio: company.bio || "",
        isPhonePublic: company.isPhonePublic || false,
        isEmailPublic: company.isEmailPublic || false,
        ctaText: company.ctaText || "",
        customLinks: parsedCustomLinks,
        tags: company.tags || [],
      });
      
      setCustomLinks(parsedCustomLinks);
      setTags(company.tags || []);
    }
  }, [company, form.reset]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyProfileFormValues) => {
      if (!company) {
        throw new Error("No company found to update");
      }
      
      const formattedData = {
        ...data,
        tags: tags,
      };

      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update company profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the user companies query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ["/api/companies/user/companies"] });
      toast({
        title: "Success",
        description: "Company profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyProfileFormValues) => {
      const formattedData = {
        ...data,
        tags: tags,
      };

      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create company profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/user/companies"] });
      toast({
        title: "Success",
        description: "Company profile created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      // Update customLinks in the form data before submitting
      data.customLinks = customLinks;
      
      if (company) {
        const result = await updateCompanyMutation.mutateAsync(data);
        toast({
          title: "Success",
          description: (
            <div>
              Company profile updated. View your public profile at{' '}
              <a 
                href={`/companies/${formatCompanyNameForUrl(data.name, company.id.toString())}`} 
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                /companies/{formatCompanyNameForUrl(data.name, company.id.toString())}
              </a>
            </div>
          ),
          duration: 8000,
        });
      } else {
        const result = await createCompanyMutation.mutateAsync(data);
        const newCompanyId = result.company.id;
        toast({
          title: "Success",
          description: (
            <div>
              Company profile created. View your public profile at{' '}
              <a 
                href={`/companies/${formatCompanyNameForUrl(data.name, newCompanyId.toString())}`}
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                /companies/{formatCompanyNameForUrl(data.name, newCompanyId.toString())}
              </a>
            </div>
          ),
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  });

  // Tag handling is now managed by the TagSelector component

  const handleAddCustomLink = () => {
    if (newLinkTitle && newLinkUrl) {
      const newLink: UserCustomLink = {
        title: newLinkTitle,
        url: newLinkUrl,
      };
      
      setCustomLinks([...customLinks, newLink]);
      setNewLinkTitle("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveCustomLink = (index: number) => {
    const updatedLinks = [...customLinks];
    updatedLinks.splice(index, 1);
    setCustomLinks(updatedLinks);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-3xl mx-auto pt-3 pb-24">
        <Card className="border-none shadow-none">
          <CardHeader className="px-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold">
                {company ? 'Company Profile' : 'Create Company Profile'}
              </CardTitle>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => {
                  if (value) setTheme(value as "light" | "dark" | "system");
                }}
                className="bg-background border rounded-md"
              >
                <ToggleGroupItem value="light" size="sm" className="px-3">
                  <Sun className="h-4 w-4" />
                  <span className="sr-only">Light</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" size="sm" className="px-3">
                  <Moon className="h-4 w-4" />
                  <span className="sr-only">Dark</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="system" size="sm" className="px-3">
                  <Monitor className="h-4 w-4" />
                  <span className="sr-only">System</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            {isCompaniesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>

                
                {!hasActiveSubscription && !isSubscriptionLoading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-8">
                      <div className="text-center space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="text-xl font-semibold">Company Profile Management requires a subscription</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Upgrade to create and manage your company profile, add team members, and showcase your business in the Sarasota Tech directory.
                        </p>
                        <Button 
                          onClick={startSubscription} 
                          className="mt-2"
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">Basic Information</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Enter your company's basic information to be displayed in the directory.
                          </p>
                          
                          {/* Company Name */}
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Your company name" 
                                    {...field} 
                                    disabled={!canEditCompany && !!company}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Industry */}
                          <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Industry</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value || ""} 
                                  value={field.value || ""}
                                  disabled={!canEditCompany && !!company}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {INDUSTRY_OPTIONS.map((industry) => (
                                      <SelectItem key={industry} value={industry}>
                                        {industry}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Company size */}
                          <FormField
                            control={form.control}
                            name="size"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Company Size</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value || ""} 
                                  value={field.value || ""}
                                  disabled={!canEditCompany && !!company}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select company size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {COMPANY_SIZE_OPTIONS.map((size) => (
                                      <SelectItem key={size} value={size}>
                                        {size} employees
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Founded year */}
                          <FormField
                            control={form.control}
                            name="founded"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Founded</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value || ""} 
                                  value={field.value || ""}
                                  disabled={!canEditCompany && !!company}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Year founded" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {FOUNDED_YEAR_OPTIONS.map((year) => (
                                      <SelectItem key={year} value={year}>
                                        {year}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Bio/Short description */}
                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Short Bio</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="A brief description of your company (max 300 characters)"
                                    className="resize-none"
                                    {...field}
                                    value={field.value || ""}
                                    disabled={!canEditCompany && !!company}
                                  />
                                </FormControl>
                                <FormDescription>
                                  This will appear on your company card in the directory.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Full Description */}
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Full Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Detailed description of your company, services, and mission"
                                    className="min-h-[150px]"
                                    {...field}
                                    value={field.value || ""}
                                    disabled={!canEditCompany && !!company}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-4">
                          <h3 className="text-lg font-medium">Contact Information</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            How people can reach your company.
                          </p>
                          
                          {/* Email */}
                          <div className="grid gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="isEmailPublic"
                              render={({ field: switchField }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>
                                      Email Visibility
                                    </FormLabel>
                                    <FormDescription>
                                      Make your company email public
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={switchField.value}
                                      onCheckedChange={switchField.onChange}
                                      disabled={!canEditCompany && !!company}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder="company@example.com"
                                    disabled={!canEditCompany && !!company}
                                  />
                                </div>
                              )}
                            />
                          </div>
                          
                          {/* Phone */}
                          <div className="grid gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="isPhonePublic"
                              render={({ field: switchField }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>
                                      Phone Visibility
                                    </FormLabel>
                                    <FormDescription>
                                      Make your company phone number public
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={switchField.value}
                                      onCheckedChange={switchField.onChange}
                                      disabled={!canEditCompany && !!company}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder="+1 (555) 123-4567"
                                    disabled={!canEditCompany && !!company}
                                  />
                                </div>
                              )}
                            />
                          </div>
                          
                          {/* Website */}
                          <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Website</FormLabel>
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <FormControl>
                                    <Input 
                                      placeholder="https://yourcompany.com" 
                                      {...field} 
                                      value={field.value || ""}
                                      disabled={!canEditCompany && !!company}
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Address */}
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  {(canEditCompany || !company) ? (
                                    <LocationPicker
                                      defaultValue={field.value ? { address: field.value } : null}
                                      onLocationSelect={(location) => {
                                        if (location) {
                                          field.onChange(location.formatted_address || location.address);
                                        } else {
                                          field.onChange("");
                                        }
                                      }}
                                      className="w-full"
                                    />
                                  ) : (
                                    <Input 
                                      placeholder="123 Main St, Sarasota, FL 34236" 
                                      value={field.value || ""}
                                      disabled
                                    />
                                  )}
                                </FormControl>
                                <FormDescription>
                                  Enter your company's address to help customers find you
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-4">
                          <h3 className="text-lg font-medium">Custom Links</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Add links to your social media, careers page, or other important pages.
                          </p>
                          
                          <div className="space-y-2 mb-4">
                            {customLinks.map((link, index) => (
                              <div 
                                key={index}
                                className="flex items-center space-x-2 p-2 border rounded-md"
                              >
                                <div className="flex-1 overflow-hidden">
                                  <p className="font-medium truncate">{link.title}</p>
                                  <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleRemoveCustomLink(index)}
                                  disabled={!canEditCompany && !!company}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            {(canEditCompany || !company) && (
                              <div className="flex flex-col space-y-2 mt-4 p-3 border border-dashed rounded-md">
                                <FormField
                                  control={form.control}
                                  name="customLinks"
                                  render={() => (
                                    <FormItem>
                                      <FormLabel>Title</FormLabel>
                                      <FormControl>
                                        <Input 
                                          value={newLinkTitle} 
                                          onChange={(e) => setNewLinkTitle(e.target.value)}
                                          placeholder="Contact Us, Learn More, etc."
                                          disabled={!canEditCompany && !!company}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                
                                <FormItem>
                                  <FormLabel>URL</FormLabel>
                                  <div className="flex items-center space-x-2">
                                    <FormControl>
                                      <Input 
                                        value={newLinkUrl} 
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        disabled={!canEditCompany && !!company}
                                      />
                                    </FormControl>
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      onClick={handleAddCustomLink}
                                      disabled={!newLinkTitle || !newLinkUrl}
                                    >
                                      <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                  </div>
                                </FormItem>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <h3 className="text-lg font-medium">Media</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Add your company logo and featured image.
                          </p>
                          
                          {/* Logo URL */}
                          <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem className="mb-6">
                                <FormLabel>Company Logo</FormLabel>
                                <div className="grid gap-2">
                                  {(canEditCompany || !company) ? (
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Input 
                                          placeholder="https://example.com/logo.png" 
                                          {...field} 
                                          value={field.value || ""}
                                        />
                                        <UnsplashPicker
                                          value={field.value || ""}
                                          onChange={(value) => field.onChange(value)}
                                        />
                                      </div>
                                    </FormControl>
                                  ) : (
                                    <FormControl>
                                      <Input 
                                        placeholder="https://example.com/logo.png" 
                                        value={field.value || ""}
                                        disabled
                                      />
                                    </FormControl>
                                  )}
                                  {field.value && (
                                    <div className="flex justify-center p-2 border rounded-md">
                                      <img 
                                        src={field.value} 
                                        alt="Company Logo" 
                                        className="h-20 object-contain" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Logo+Error';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                                <FormDescription>
                                  Your logo should be a square image. Recommended size 200x200 pixels.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Featured Image URL */}
                          <FormField
                            control={form.control}
                            name="featuredImageUrl"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Featured Image</FormLabel>
                                <div className="grid gap-2">
                                  {(canEditCompany || !company) ? (
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Input 
                                          placeholder="https://example.com/featured.jpg" 
                                          {...field} 
                                          value={field.value || ""}
                                        />
                                        <UnsplashPicker
                                          value={field.value || ""}
                                          onChange={(value) => field.onChange(value)}
                                        />
                                      </div>
                                    </FormControl>
                                  ) : (
                                    <FormControl>
                                      <Input 
                                        placeholder="https://example.com/featured.jpg" 
                                        value={field.value || ""}
                                        disabled
                                      />
                                    </FormControl>
                                  )}
                                  {field.value && (
                                    <div className="p-2 border rounded-md">
                                      <img 
                                        src={field.value} 
                                        alt="Featured" 
                                        className="w-full h-48 object-cover rounded" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://placehold.co/800x400?text=Featured+Image+Error';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                                <FormDescription>
                                  This image will be displayed on your company profile page.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-4">
                          <h3 className="text-lg font-medium">Tags</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Add up to 5 tags to help people find your company.
                          </p>
                          
                          <div className="space-y-4">
                            <TagSelector
                              tags={tags}
                              maxTags={5}
                              onTagsChange={(newTags) => {
                                setTags(newTags);
                                form.setValue("tags", newTags);
                              }}
                              readOnly={!(canEditCompany || !company)}
                              placeholder="Search or add new tag..."
                            />
                          </div>
                        </div>
                        
                        <div className="pt-6">
                          <FormField
                            control={form.control}
                            name="ctaText"
                            render={({ field }) => (
                              <FormItem className="mb-4">
                                <FormLabel>Call to Action Text</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., 'Request a Demo', 'Learn More'" 
                                    {...field} 
                                    value={field.value || ""}
                                    disabled={!canEditCompany && !!company}
                                  />
                                </FormControl>
                                <FormDescription>
                                  A call-to-action button will appear on your profile with this text, linked to your website.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-6 flex justify-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button 
                                    type="submit"
                                    disabled={!canEditCompany && !!company}
                                    className="px-6"
                                  >
                                    {updateCompanyMutation.isPending || createCompanyMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {company ? 'Updating...' : 'Creating...'}
                                      </>
                                    ) : (
                                      <>{company ? 'Update Profile' : 'Create Profile'}</>
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canEditCompany && !!company && (
                                <TooltipContent>
                                  <p>You need admin privileges and an active subscription to edit the company profile.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </form>
                  </Form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}