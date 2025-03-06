import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Person } from '@/components/people/PeopleDirectory';
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

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/5 rounded-md">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-semibold text-foreground">{value}</p>
          {description && (
            <span className="text-xs text-muted-foreground">({description})</span>
          )}
        </div>
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

  const form = useForm({
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

  const { data: person, isLoading: personLoading, error: personError } = useQuery<Person>({
    queryKey: ['/api/people', personId],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) throw new Error('Failed to fetch person details');
      return response.json();
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/people', personId, 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch person stats');
      return response.json();
    }
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/people', personId, 'events'],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    }
  });

  const { data: userStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/auth/check-profile', personId],
    queryFn: async () => {
      const response = await fetch(`/api/auth/check-profile/${personId}`);
      if (!response.ok) throw new Error('Failed to check profile status');
      return response.json();
    }
  });

  // Get unique list of existing tags from all users
  const { data: existingTags } = useQuery<{ tags: string[] }>({
    queryKey: ["/api/tags/profile"],
  });

  // Get unique list of existing tag texts
  const existingTagTexts = Array.from(new Set(existingTags?.tags || []));

  // Filter tags based on input
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

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.watch("profileTags") || [];
    form.setValue("profileTags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const isLoading = personLoading || statsLoading || statusLoading || eventsLoading;
  const error = personError;

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertUserSchema>) => {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          customLinks: values.customLinks || [],
          profileTags: values.profileTags || []
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof insertUserSchema>) => {
    try {
      // Log the form data before submission
      console.log('Submitting form data:', values);
      await updateProfileMutation.mutateAsync(values);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // Effect to reset form when editing starts or person data changes
  useEffect(() => {
    if (person?.user && isEditing) {
      console.log('Resetting form with person data:', person.user);
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
  }, [person, isEditing, form]);

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-3">
        <p className="text-xs text-destructive">Failed to load person details</p>
      </div>
    );
  }

  if (isLoading) {
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

  const isAdmin = Boolean(user?.isAdmin);
  const isOwnProfile = user?.api_id === person?.api_id;
  const isClaimed = userStatus?.isClaimed || isOwnProfile;
  const isProfileAdmin = person.user?.isAdmin || false;

  const userBadges = [
    { name: "Top Contributor", icon: <Star className="h-3 w-3" /> },
    { name: "Code Mentor", icon: <Code className="h-3 w-3" /> },
    { name: "Community Leader", icon: <Heart className="h-3 w-3" /> }
  ];

  const renderEditableSection = (
    title: string,
    fieldName: keyof z.infer<typeof insertUserSchema>,
    isTextArea = false
  ) => {
    const value = form.watch(fieldName);

    if (!isEditing) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {person.avatarUrl ? (
                <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
              ) : (
                <AvatarFallback className="text-xl">
                  {person.userName
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
                {person.userName || "Anonymous"}
                {person.role && (
                  <Badge variant="secondary" className="ml-2">
                    {person.role}
                  </Badge>
                )}
                {isProfileAdmin && <AdminBadge />}
              </h1>
              <div className="flex items-center gap-2">
                <AuthGuard>
                  <p className="text-muted-foreground">{person.email}</p>
                </AuthGuard>
              </div>
            </div>
          </div>

          {user ? (
            isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel
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
                <Button
                  variant={isClaimed ? "outline" : "default"}
                  className={isClaimed ? "cursor-default" : ""}
                  disabled={isClaimed}
                >
                  {isClaimed ? "Profile Claimed" : "Claim Profile"}
                </Button>
              }
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {userBadges.map((badge, index) => (
            <ProfileBadge
              key={index}
              name={badge.name}
              icon={badge.icon}
            />
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardContent className="py-4 pt-4 space-y-4">
                {renderEditableSection("About", "bio", true)}
                {renderEditableSection("Company", "companyName")}
                {renderEditableSection("Company Description", "companyDescription", true)}
                {renderEditableSection("Address", "address")}
                {renderEditableSection("Phone Number", "phoneNumber")}

                {/* Tags Section */}
                <div className="space-y-2">
                  <h3 className="font-medium">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.watch("profileTags")?.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
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
                  {isEditing ? (
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
                  ) : (
                    person.user?.customLinks?.map((link, index) => {
                      const Icon = LucideIcons[link.icon as keyof typeof LucideIcons] || LucideIcons.Link;
                      return (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{link.name}</span>
                        </a>
                      );
                    })
                  )}
                </div>

                {isEditing && (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </form>
        </Form>

        <AuthGuard>
          <MemberDetails />
        </AuthGuard>
      </div>

      <div>
        <Card className="p-4">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-4">
              <StatsCard
                title="First Seen"
                value={stats?.firstSeen ? format(new Date(stats.firstSeen), "MMM d, yyyy") : "Unknown"}
                icon={<CalendarDays className="h-4 w-4 text-foreground" />}
              />
              <StatsCard
                title="Events Attended"
                value={events?.length || 0}
                icon={<Users className="h-4 w-4 text-foreground" />}
              />
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !events?.length ? (
              <p className="text-sm text-muted-foreground">No events attended yet.</p>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <div key={event.api_id} className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.startTime), 'MMM d, yyyy, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}