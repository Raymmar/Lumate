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
import { X, Loader2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TagSelector } from "@/components/ui/tag-selector";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IndustrySelector } from "@/components/ui/industry-selector";

// Industry options moved to database, see IndustrySelector component

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
  onCancel
}: CompanyFormProps & { onCancel?: () => void }) {
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [customLinks, setCustomLinks] = useState<UserCustomLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);
  
  // Fetch all users for member assignment
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<{ users: User[], total: number }>({
    queryKey: ["/api/admin/members"],
    queryFn: async () => {
      const response = await fetch("/api/admin/members?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch members");
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

  // Fetch company members when company id changes
  const { data: companyMembersData, isLoading: isLoadingCompanyMembers } = useQuery<{members: Array<{userId: number, role: string}>}>({
    queryKey: ['/api/companies/members', company?.id],
    queryFn: async () => {
      if (!company?.id) return { members: [] };
      const response = await fetch(`/api/companies/${company.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch company members');
      }
      return response.json();
    },
    enabled: !!company?.id
  });

  // Update form values and members when company data is loaded
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
      
      // Process tags to handle both string tags and object tags
      let processedTags: string[] = [];
      if (company.tags && Array.isArray(company.tags)) {
        processedTags = company.tags.map((tag: any) => {
          if (typeof tag === 'string') {
            return tag;
          } else if (tag && typeof tag === 'object' && tag.text) {
            return tag.text;
          }
          return '';
        }).filter(Boolean);
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
        tags: processedTags,
      });
      
      setCustomLinks(parsedCustomLinks);
      setTags(processedTags);
    }
  }, [company, form]);
  
  // Set members and owner when member data is loaded
  useEffect(() => {
    if (companyMembersData?.members && companyMembersData.members.length > 0) {
      // Get all member user IDs
      const memberUserIds = companyMembersData.members.map(member => member.userId);
      setSelectedMembers(memberUserIds);
      
      // First try to find a member with explicit 'owner' role
      let ownerMember = companyMembersData.members.find(member => member.role === 'owner');
      
      // If no explicit owner found, look for 'admin' role as fallback 
      // (since existing companies may use admin instead of owner)
      if (!ownerMember) {
        ownerMember = companyMembersData.members.find(member => member.role === 'admin');
      }
      
      // If still no owner found but we have members, use the first member as owner
      if (!ownerMember && companyMembersData.members.length > 0) {
        ownerMember = companyMembersData.members[0];
      }
      
      if (ownerMember) {
        setOwnerUserId(ownerMember.userId);
        console.log(`Set owner to user ID ${ownerMember.userId} with role ${ownerMember.role}`);
      }
    }
  }, [companyMembersData]);

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

  // Handle member selection
  const handleMemberToggle = (userId: number) => {
    setSelectedMembers(current => {
      if (current.includes(userId)) {
        // If the user is being removed and they are the owner, clear the owner
        if (ownerUserId === userId) {
          setOwnerUserId(null);
        }
        return current.filter(id => id !== userId);
      } else {
        // If this is the first member, automatically set as owner
        if (current.length === 0) {
          setOwnerUserId(userId);
        }
        return [...current, userId];
      }
    });
  };
  
  // Handle setting a member as the company owner
  const handleSetOwner = (userId: number) => {
    setOwnerUserId(userId);
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
      
      // Check if we have an owner selected, otherwise default to first member
      const owner = ownerUserId || (selectedMembers.length > 0 ? selectedMembers[0] : null);
      
      // We'll pass the form data and selected members to the onSubmit handler
      // This way the CompanyPreview component can handle both the company creation
      // and the company member assignments
      await onSubmit({
        ...formData,
        // Pass along selected members as additional data (not part of InsertCompany type)
        _selectedMembers: selectedMembers,
        _ownerUserId: owner
      } as any);
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
                  <FormControl>
                    <IndustrySelector 
                      industry={field.value || null}
                      onIndustryChange={field.onChange}
                      readOnly={readOnly}
                      placeholder="Select an industry"
                    />
                  </FormControl>
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
                <FormItem>
                  <FormLabel>Company Size</FormLabel>
                  <Select
                    disabled={readOnly}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[99999999]">
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
                  <Select
                    disabled={readOnly}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year founded" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px] z-[99999999]">
                      {FOUNDED_YEAR_OPTIONS.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            
            <TagSelector
              tags={tags}
              maxTags={5}
              onTagsChange={(newTags) => {
                setTags(newTags);
                form.setValue("tags", newTags);
              }}
              readOnly={readOnly}
              placeholder="Search or add new tag..."
            />
            
            <FormDescription>
              Add tags to categorize your company (e.g., AI, SaaS, Enterprise)
            </FormDescription>
          </div>
        </div>

        {/* Company Members */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Company Members</h3>
          
          <div>
            <FormLabel>Company Owner / Members</FormLabel>
            <FormDescription className="mt-1 mb-4">
              Select one or more users to associate with this company. Selected users will be added as company members once created.
            </FormDescription>
            
            {!readOnly && (
              <div className="space-y-4">
                {/* Show selected members FIRST (above the dropdown) so they're immediately visible */}
                {selectedMembers.length > 0 && (
                  <div className="border border-primary/20 rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">
                        Selected Members ({selectedMembers.length})
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map(userId => {
                        const user = usersData?.users?.find((u: User) => u.id === userId);
                        return user ? (
                          <Badge 
                            key={userId} 
                            variant={userId === ownerUserId ? "default" : "secondary"} 
                            className="flex items-center gap-1 px-3 py-1.5 text-sm"
                          >
                            {userId === ownerUserId && "👑 "}
                            {user.displayName || user.email}
                            <button
                              type="button"
                              onClick={() => handleMemberToggle(userId)}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                              data-testid={`button-remove-member-${userId}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Add / Remove Company Members
                    <span className="text-muted-foreground ml-1 text-xs font-normal">(Optional)</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="justify-between w-full md:w-80 border-primary/40"
                        data-testid="button-select-members"
                      >
                        {selectedMembers.length > 0 
                          ? `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`
                          : "Select members"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full md:w-80 p-0 z-[99999999]" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandEmpty>
                          {isLoadingUsers ? "Loading users..." : "No users found."}
                        </CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {isLoadingUsers ? (
                              <div className="flex justify-center items-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <ScrollArea className="h-72">
                                {usersData?.users?.map((user: User) => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.email}
                                    onSelect={() => handleMemberToggle(user.id)}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <div className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                                        selectedMembers.includes(user.id) 
                                          ? "bg-primary text-primary-foreground" 
                                          : "opacity-50"
                                      )}>
                                        {selectedMembers.includes(user.id) && (
                                          <Check className="h-3 w-3" />
                                        )}
                                      </div>
                                      <span className="flex-1 truncate">{user.displayName || user.email}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedMembers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Company Owner <span className="text-destructive">*</span>
                    </label>
                    <FormDescription className="mt-0 mb-2">
                      Select which member will be the company owner/admin
                    </FormDescription>
                    <Select
                      disabled={readOnly}
                      onValueChange={(value) => handleSetOwner(parseInt(value))}
                      value={ownerUserId?.toString() || undefined}
                      defaultValue={ownerUserId?.toString() || undefined}
                    >
                      <SelectTrigger className="w-full md:w-80">
                        <SelectValue placeholder="Select company owner" />
                      </SelectTrigger>
                      <SelectContent className="z-[99999999]">
                        {selectedMembers.map(userId => {
                          const user = usersData?.users?.find((u: User) => u.id === userId);
                          return user ? (
                            <SelectItem key={userId} value={userId.toString()}>
                              {user.displayName || user.email}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
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
          <div className="flex justify-between">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className={onCancel ? "" : "ml-auto"}
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