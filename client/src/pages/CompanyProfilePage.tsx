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
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5000+ employees"
];

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
  const [currentTag, setCurrentTag] = useState("");
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
  const isCompanyAdmin = company?.role === 'admin';
  
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

  const handleSelectTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (!tags.includes(normalizedTag) && tags.length < 5) {
      setTags([...tags, normalizedTag]);
    }
    setCurrentTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

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
                {company && !isCompanyAdmin && (
                  <Alert variant="default" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You are a member of this company but not an administrator. Contact a company admin to make changes to this profile.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!hasActiveSubscription && !isSubscriptionLoading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-8">
                      <div className="text-center space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            Paid Members Only
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Upgrade your account to unlock additional premium
                            features including company details, contact information, and business profile.
                          </p>
                          <Button
                            onClick={startSubscription}
                            className="mt-4 bg-[#FEA30E] hover:bg-[#FEA30E]/90 text-black"
                          >
                            Upgrade to Premium
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-6">
                      {/* Basic Company Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Information</h3>
                        
                        <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Company Name"
                                disabled={!isCompanyAdmin && !!company}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>Company Bio</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Short company description or tagline (max 300 characters)"
                                  className="resize-none h-20 min-h-[80px]"
                                  maxLength={300}
                                  disabled={!isCompanyAdmin && !!company}
                                />
                                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                  {(field.value?.length || 0)}/300
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featuredImageUrl"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <div>
                              <FormLabel>Featured Image</FormLabel>
                              <p className="text-sm text-muted-foreground mt-1">
                                This image will be displayed as a banner on your company profile
                              </p>
                            </div>
                            <FormControl>
                              <UnsplashPicker
                                value={field.value || ""}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Company Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Company Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <Select
                                disabled={!isCompanyAdmin && !!company}
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                                defaultValue={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an industry" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <div className="max-h-[400px] overflow-y-auto">
                                    <div className="p-2 font-semibold text-xs text-muted-foreground">Tech Industries</div>
                                    {INDUSTRY_OPTIONS.slice(0, 14).map((industry) => (
                                      <SelectItem key={industry} value={industry}>
                                        {industry}
                                      </SelectItem>
                                    ))}
                                    <div className="p-2 font-semibold text-xs text-muted-foreground">Other Industries</div>
                                    {INDUSTRY_OPTIONS.slice(14).map((industry) => (
                                      <SelectItem key={industry} value={industry}>
                                        {industry}
                                      </SelectItem>
                                    ))}
                                  </div>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select the industry that best describes your company
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Size</FormLabel>
                              <Select
                                disabled={!isCompanyAdmin && !!company}
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                                defaultValue={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COMPANY_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select the number of employees at your company
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="founded"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Founded Year</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Year founded"
                                  disabled={!isCompanyAdmin && !!company}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Detailed company description"
                                  className="h-full min-h-[80px]"
                                  disabled={!isCompanyAdmin && !!company}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Contact Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Email</FormLabel>
                                <FormField
                                  control={form.control}
                                  name="isEmailPublic"
                                  render={({ field: switchField }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormLabel className="text-xs text-muted-foreground">
                                        Public
                                      </FormLabel>
                                      <FormControl>
                                        <Switch
                                          checked={switchField.value}
                                          onCheckedChange={switchField.onChange}
                                          disabled={!isCompanyAdmin && !!company}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    placeholder="company@example.com"
                                    disabled={!isCompanyAdmin && !!company}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Phone Number</FormLabel>
                                <FormField
                                  control={form.control}
                                  name="isPhonePublic"
                                  render={({ field: switchField }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormLabel className="text-xs text-muted-foreground">
                                        Public
                                      </FormLabel>
                                      <FormControl>
                                        <Switch
                                          checked={switchField.value}
                                          onCheckedChange={switchField.onChange}
                                          disabled={!isCompanyAdmin && !!company}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    placeholder="+1 (555) 123-4567"
                                    disabled={!isCompanyAdmin && !!company}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <LocationPicker
                                  defaultValue={field.value ? { address: field.value } : null}
                                  onLocationSelect={(location) => field.onChange(location?.address || "")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Custom Links */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Custom Links</h3>
                      
                      <div className="space-y-3">
                        {customLinks.map((link, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              value={link.title}
                              disabled
                              className="flex-grow-0 w-1/3"
                            />
                            <Input
                              value={link.url}
                              disabled
                              className="flex-grow"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveCustomLink(index)}
                              disabled={!isCompanyAdmin && !!company}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {(isCompanyAdmin || !company) && (
                          <div className="flex items-end space-x-2">
                            <div className="space-y-1 flex-grow-0 w-1/3">
                              <label className="text-sm font-medium">
                                Link Title
                              </label>
                              <Input
                                value={newLinkTitle}
                                onChange={(e) => setNewLinkTitle(e.target.value)}
                                placeholder="GitHub"
                              />
                            </div>
                            <div className="space-y-1 flex-grow">
                              <label className="text-sm font-medium">
                                URL
                              </label>
                              <Input
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                placeholder="https://github.com/yourcompany"
                              />
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              onClick={handleAddCustomLink}
                              disabled={!newLinkTitle || !newLinkUrl}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Tags</h3>
                      
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {tag}
                              {(isCompanyAdmin || !company) && (
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => handleRemoveTag(tag)}
                                />
                              )}
                            </Badge>
                          ))}
                        </div>
                        
                        {(isCompanyAdmin || !company) && (
                          <div className="flex space-x-2">
                            <Command className="rounded-lg border shadow-md">
                              <CommandInput
                                placeholder="Add a tag..."
                                value={currentTag}
                                onValueChange={setCurrentTag}
                                className="h-9"
                              />
                              <CommandItem
                                onSelect={() => handleSelectTag(currentTag)}
                                className={cn(
                                  "flex items-center px-2",
                                  !currentTag && "hidden"
                                )}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add "{currentTag}"
                              </CommandItem>
                            </Command>
                            <Button
                              type="button"
                              onClick={() => handleSelectTag(currentTag)}
                              disabled={!currentTag}
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Call to Action */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Call to Action</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="ctaText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CTA Text</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Contact Us, Learn More, etc."
                                  disabled={!isCompanyAdmin && !!company}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CTA URL</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    placeholder="https://example.com"
                                    disabled={!isCompanyAdmin && !!company}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {(isCompanyAdmin || !company) && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={
                            updateCompanyMutation.isPending ||
                            createCompanyMutation.isPending
                          }
                        >
                          {(updateCompanyMutation.isPending ||
                            createCompanyMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {company ? "Update Company Profile" : "Create Company Profile"}
                        </Button>
                      </div>
                    )}
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