import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { AuthGuard } from "@/components/AuthGuard";
import { AdminBadge } from "@/components/AdminBadge";
import { Star, Code, Heart, CalendarDays, Users, Edit2, Plus, X, Check, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetails } from './MemberDetails';
import { ProfileBadge } from "@/components/ui/profile-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { IconPicker } from "@/components/ui/icon-picker";
import * as LucideIcons from "lucide-react";

interface PersonProfileProps {
  personId: string;
}

// Extended Person type to include user data
interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  user?: {
    id: number;
    email: string;
    displayName: string | null;
    bio: string | null;
    companyName: string | null;
    companyDescription: string | null;
    address: string | null;
    phoneNumber: string | null;
    customLinks: Array<{ name: string; url: string; icon: string }>;
    profileTags: string[];
    isAdmin: boolean;
    eventCount: number;
    communityCount: number;
  }
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/5 rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function PersonProfile({ personId }: PersonProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      displayName: "",
      bio: "",
      companyName: "",
      companyDescription: "",
      address: "",
      phoneNumber: "",
      customLinks: [],
      profileTags: [],
    }
  });

  // Main person query
  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      console.log('Fetching person data for ID:', personId);
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      const data = await response.json();
      console.log('Received person data:', data);
      return data;
    }
  });

  // Get unique list of existing tags from all users
  const { data: existingTags, isLoading: tagsLoading, error: tagsError } = useQuery<{ tags: string[] }>({
    queryKey: ["/api/tags/profile"],
    queryFn: async () => {
      const response = await fetch('/api/tags/profile');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  // Filter tags based on input
  const existingTagTexts = Array.from(new Set(existingTags?.tags || []));
  const filteredTags = currentTag === ""
    ? existingTagTexts
    : existingTagTexts.filter((tag) =>
        tag.toLowerCase().includes(currentTag.toLowerCase()) &&
        !form.watch("profileTags")?.includes(tag.toLowerCase())
      );

  const handleSelectTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    const currentTags = form.watch("profileTags") || [];

    if (!currentTags.includes(normalizedTag) && currentTags.length < 5) {
      form.setValue("profileTags", [...currentTags, normalizedTag]);
    } else if (currentTags.length >= 5) {
      toast({
        title: "Tag limit reached",
        description: "Maximum of 5 tags allowed per profile",
        variant: "destructive"
      });
    }
    setCurrentTag("");
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertUserSchema>) => {
      console.log('Starting profile update mutation with values:', values);

      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          customLinks: values.customLinks || [],
          profileTags: values.profileTags || []
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Profile update failed:', error);
        throw new Error(error.error || 'Failed to update profile');
      }

      const data = await response.json();
      console.log('Profile update successful:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Profile update mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error('Profile update mutation failed:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (person?.user && isEditing) {
      console.log('Setting form data from person:', person.user);

      form.reset({
        email: person.user.email || "",
        displayName: person.user.displayName || "",
        bio: person.user.bio || "",
        companyName: person.user.companyName || "",
        companyDescription: person.user.companyDescription || "",
        address: person.user.address || "",
        phoneNumber: person.user.phoneNumber || "",
        customLinks: person.user.customLinks || [],
        profileTags: person.user.profileTags || [],
      });
    }
  }, [person?.user, isEditing, form]);

  if (personError) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-3">
        <p className="text-xs text-destructive">Failed to load person details</p>
      </div>
    );
  }

  if (personLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!person) {
    return <div>Person not found</div>;
  }

  const renderEditableSection = (
    title: string,
    fieldName: keyof z.infer<typeof insertUserSchema>,
    isTextArea = false
  ) => {
    if (!isEditing) {
      const value = person?.user?.[fieldName as keyof typeof person.user];
      return value ? (
        <div className="space-y-2">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{value}</p>
        </div>
      ) : null;
    }

    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>{title}</FormLabel>
            <FormControl>
              {isTextArea ? (
                <Textarea {...field} placeholder={`Enter your ${title.toLowerCase()}`} />
              ) : (
                <Input {...field} placeholder={`Enter your ${title.toLowerCase()}`} />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {person?.avatarUrl ? (
                <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
              ) : (
                <AvatarFallback className="text-xl">
                  {person?.userName
                    ? person.userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {person?.userName || "Anonymous"}
                {person?.role && (
                  <Badge variant="secondary" className="ml-2">
                    {person.role}
                  </Badge>
                )}
                {person?.user?.isAdmin && <AdminBadge />}
              </h1>
              <div className="flex items-center gap-2">
                <AuthGuard>
                  <p className="text-muted-foreground">{person?.email}</p>
                </AuthGuard>
              </div>
            </div>
          </div>

          {/* Edit/Save Button */}
          {user ? (
            user.api_id === person?.api_id ? (
              <Button
                variant="outline"
                onClick={isEditing ? form.handleSubmit(async (values) => {
                  console.log('Form submission started with values:', values);
                  try {
                    await updateProfileMutation.mutateAsync(values);
                  } catch (error) {
                    console.error('Form submission failed:', error);
                  }
                }) : () => setIsEditing(true)}
                className="gap-2"
                disabled={updateProfileMutation.isPending}
              >
                {isEditing ? (
                  <>
                    <Check className="h-4 w-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            ) : null
          ) : (
            <ClaimProfileDialog
              personId={personId}
              trigger={
                <Button variant="outline">
                  Claim Profile
                </Button>
              }
            />
          )}
        </div>

        {/* Profile Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (values) => {
            console.log('Form submission started with values:', values);
            try {
              await updateProfileMutation.mutateAsync(values);
            } catch (error) {
              console.error('Form submission failed:', error);
            }
          })} className="space-y-4">
            <Card>
              <CardContent className="py-4 pt-4 space-y-4">
                {/* Render editable sections */}
                {renderEditableSection("About", "bio", true)}
                {renderEditableSection("Company", "companyName")}
                {renderEditableSection("Company Description", "companyDescription", true)}
                {renderEditableSection("Address", "address")}
                {renderEditableSection("Phone Number", "phoneNumber")}

                {/* Tags Section */}
                <div className="space-y-2">
                  <h3 className="font-medium">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(person?.user?.profileTags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentTags = form.watch("profileTags") || [];
                              form.setValue("profileTags", currentTags.filter(t => t !== tag));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>

                  {/* Tag editing UI */}
                  {isEditing && (
                    <div className="relative">
                      <Command className="rounded-lg overflow-visible border-0">
                        <CommandInput
                          placeholder="Search tags or create new ones..."
                          value={currentTag}
                          onValueChange={setCurrentTag}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && currentTag.trim()) {
                              e.preventDefault();
                              handleSelectTag(currentTag);
                            }
                          }}
                          onFocus={() => setIsTagSearchFocused(true)}
                          onBlur={() => {
                            setTimeout(() => setIsTagSearchFocused(false), 200);
                          }}
                          className="border-0 focus:ring-0 focus-visible:ring-0"
                        />
                        {isTagSearchFocused && (currentTag || filteredTags.length > 0) && (
                          <div className="absolute top-full left-0 right-0 bg-popover rounded-lg shadow-md mt-1 z-50">
                            <CommandEmpty>
                              {currentTag.trim() && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                                  onClick={() => handleSelectTag(currentTag)}
                                >
                                  Create tag "{currentTag}"
                                </button>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredTags.map((tag) => (
                                <CommandItem
                                  key={tag}
                                  value={tag}
                                  onSelect={handleSelectTag}
                                  className="flex items-center gap-2"
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      form.watch("profileTags")?.includes(tag.toLowerCase())
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {tag}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </div>
                        )}
                      </Command>
                    </div>
                  )}
                </div>

                {/* Links Section */}
                <div className="space-y-2">
                  <h3 className="font-medium">Links</h3>
                  {!isEditing && (
                    <div className="grid gap-2">
                      {(person?.user?.customLinks || []).map((link, index) => {
                        const Icon = LucideIcons[link.icon as keyof typeof LucideIcons] || LucideIcons.Link;
                        return (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{link.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {isEditing && (
                    <div className="space-y-2">
                      {form.watch("customLinks")?.map((link, index) => (
                        <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-start">
                          <div className="space-y-2">
                            <Input
                              placeholder="Link name"
                              value={link.name}
                              onChange={(e) => {
                                const links = [...(form.watch("customLinks") || [])];
                                links[index] = { ...links[index], name: e.target.value };
                                form.setValue("customLinks", links);
                              }}
                            />
                            <Input
                              placeholder="URL"
                              value={link.url}
                              onChange={(e) => {
                                const links = [...(form.watch("customLinks") || [])];
                                links[index] = { ...links[index], url: e.target.value };
                                form.setValue("customLinks", links);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Icon</label>
                            <IconPicker
                              value={link.icon}
                              onChange={(icon) => {
                                const links = [...(form.watch("customLinks") || [])];
                                links[index] = { ...links[index], icon };
                                form.setValue("customLinks", links);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const links = form.watch("customLinks")?.filter((_, i) => i !== index);
                              form.setValue("customLinks", links);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const links = [...(form.watch("customLinks") || [])];
                          if (links.length < 5) {
                            links.push({ name: "", url: "", icon: "link" });
                            form.setValue("customLinks", links);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>

        <AuthGuard>
          <MemberDetails />
        </AuthGuard>
      </div>

      {/* Stats Section */}
      <div>
        <Card className="p-4">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-4">
              <StatsCard
                title="Events"
                value={person?.user?.eventCount || 0}
                icon={<CalendarDays className="h-4 w-4 text-foreground" />}
              />
              <StatsCard
                title="Community"
                value={person?.user?.communityCount || 0}
                icon={<Users className="h-4 w-4 text-foreground" />}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}