import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Company, InsertCompany, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";

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

// Type definition for custom links
interface UserCustomLink {
  title: string;
  url: string;
  icon?: string;
}

const companyFormSchema = z.object({
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

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  company?: Company;
  onSubmit: (data: InsertCompany) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function CompanyForm({
  company,
  onSubmit,
  isLoading = false,
  readOnly = false,
}: CompanyFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [customLinks, setCustomLinks] = useState<UserCustomLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  
  // Fetch all users for member assignment
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    }
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
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
          parsedCustomLinks = JSON.parse(company.customLinks as string);
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
  }, [company, form]);

  // Handle tag addition
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      const newTags = [...tags, currentTag.trim()];
      setTags(newTags);
      form.setValue("tags", newTags);
      setCurrentTag("");
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue("tags", newTags);
  };

  // Handle custom link addition
  const handleAddCustomLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      try {
        // Validate URL format
        new URL(newLinkUrl);
        
        const newLink: UserCustomLink = {
          title: newLinkTitle.trim(),
          url: newLinkUrl.trim(),
        };
        
        const updatedLinks = [...customLinks, newLink];
        setCustomLinks(updatedLinks);
        form.setValue("customLinks", updatedLinks);
        
        // Clear input fields
        setNewLinkTitle("");
        setNewLinkUrl("");
      } catch (error) {
        form.setError("customLinks", {
          type: "manual",
          message: "Invalid URL format",
        });
      }
    }
  };

  // Handle custom link removal
  const handleRemoveCustomLink = (index: number) => {
    const updatedLinks = customLinks.filter((_, i) => i !== index);
    setCustomLinks(updatedLinks);
    form.setValue("customLinks", updatedLinks);
  };

  // Handle form submission
  const handleSubmit = async (values: CompanyFormValues) => {
    try {
      const formData: InsertCompany = {
        ...values,
        // Ensure proper types for DB insert
        tags: values.tags || [],
        customLinks: values.customLinks || [],
      };
      
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting company form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter company name" 
                    {...field} 
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  Official name of your business
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Email Contact</FormLabel>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.watch("isEmailPublic")}
                        onCheckedChange={(checked) => form.setValue("isEmailPublic", checked)}
                        disabled={readOnly}
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground">
                        {form.watch("isEmailPublic") ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="contact@yourcompany.com" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={readOnly}
                    />
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
                  <div className="flex justify-between items-center">
                    <FormLabel>Phone Number</FormLabel>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.watch("isPhonePublic")}
                        onCheckedChange={(checked) => form.setValue("isPhonePublic", checked)}
                        disabled={readOnly}
                        className="scale-75"
                      />
                      <span className="text-xs text-muted-foreground">
                        {form.watch("isPhonePublic") ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="(941) 123-4567" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://yourcompany.com" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call-to-Action Text</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Contact Us" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>
                    Text for your call-to-action button
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Logo</FormLabel>
                  <FormControl>
                    <UnsplashPicker 
                      value={field.value || ""} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormDescription>
                    Select or upload your company logo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featuredImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured Image</FormLabel>
                  <FormControl>
                    <UnsplashPicker 
                      value={field.value || ""} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormDescription>
                    Select or upload a featured image for your company profile
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Short Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description of your company" 
                    {...field} 
                    value={field.value || ""} 
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  A brief one or two-sentence description of your company
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Short bio for your company profile" 
                    {...field} 
                    value={field.value || ""} 
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  A short bio that will appear on your company profile (max 300 characters)
                </FormDescription>
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
                    disabled={readOnly}
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
                    Select the industry your company operates in
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Company Size</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={readOnly}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? COMPANY_SIZE_OPTIONS.find(
                                (size) => size === field.value
                              )
                            : "Select company size"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" side="bottom" sideOffset={8} style={{ zIndex: 100 }}>
                      <Command>
                        <CommandInput placeholder="Search size..." />
                        <CommandEmpty>No size option found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {COMPANY_SIZE_OPTIONS.map((size) => (
                            <CommandItem
                              key={size}
                              value={size}
                              onSelect={() => {
                                form.setValue("size", size);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  size === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {size}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                <FormItem className="flex flex-col">
                  <FormLabel>Founded Year</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={readOnly}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? FOUNDED_YEAR_OPTIONS.find(
                                (year) => year === field.value
                              )
                            : "Select founded year"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" side="bottom" sideOffset={8} style={{ zIndex: 100 }}>
                      <Command>
                        <CommandInput placeholder="Search year..." />
                        <CommandEmpty>No year found.</CommandEmpty>
                        <CommandGroup className="max-h-[400px] overflow-y-auto">
                          {FOUNDED_YEAR_OPTIONS.map((year) => (
                            <CommandItem
                              key={year}
                              value={year}
                              onSelect={() => {
                                form.setValue("founded", year);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  year === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {year}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Year the company was founded
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

          {/* Privacy settings are now integrated directly with the email/phone fields */}
        </div>

        {/* Company Tags */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Tags</h3>
          
          <div>
            <FormLabel>Company Tags</FormLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-sm px-2 py-1">
                  {tag}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag"
                  className="max-w-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>
            )}
            <FormDescription>
              Add tags to categorize your company (e.g., AI, SaaS, Enterprise)
            </FormDescription>
          </div>
        </div>

        {/* Custom Links */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Custom Links</h3>
          
          <div>
            <FormLabel>External Links</FormLabel>
            <div className="space-y-2 mb-4">
              {customLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium truncate">{link.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{link.url}</div>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {!readOnly && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Link Title"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="URL (https://...)"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomLink}
                  disabled={!newLinkTitle || !newLinkUrl}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
            )}
            <FormDescription>
              Add links to your company's social media profiles or other relevant websites
            </FormDescription>
            {form.formState.errors.customLinks?.message && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.customLinks.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {company ? "Update Company" : "Create Company"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}