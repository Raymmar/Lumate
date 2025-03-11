import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Command, CommandInput } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { type UpdateUserProfile, type Location } from "@shared/schema";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Monitor } from "lucide-react";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfileSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function UserSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  useEffect(() => {
    initGoogleMaps();
    // Refresh user data when component mounts
    refreshUser();
  }, [refreshUser]);

  const form = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      featuredImageUrl: "",
      companyName: "",
      companyDescription: "",
      address: null,
      phoneNumber: "",
      isPhonePublic: false,
      isEmailPublic: false,
      ctaText: "",
      customLinks: [],
      tags: [],
    }
  });

  // Initialize form with user data when available
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        bio: user.bio || "",
        featuredImageUrl: user.featuredImageUrl || "",
        companyName: user.companyName || "",
        companyDescription: user.companyDescription || "",
        address: user.address ? (typeof user.address === 'string' ? { address: user.address } : user.address) as Location : null,
        phoneNumber: user.phoneNumber || "",
        isPhonePublic: user.isPhonePublic || false,
        isEmailPublic: user.isEmailPublic || false,
        ctaText: user.ctaText || "",
        customLinks: user.customLinks || [],
        tags: user.tags || [],
      });
      setTags(user.tags || []);
    }
  }, [user]);

  // Check subscription status directly from user object
  const hasActiveSubscription = user?.isAdmin || user?.subscriptionStatus === 'active';
  const isLoading = !user;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const formattedData = {
        ...data,
        displayName: user?.displayName,
        address: data.address || null,
        tags: tags,
      };

      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const startSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No portal URL received');
      }

      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (!tags.includes(normalizedTag) && tags.length < 5) {
      setTags([...tags, normalizedTag]);
    }
    setCurrentTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading your profile...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-3xl mx-auto pt-3 pb-6">
        <Card className="border-none shadow-none">
          <CardHeader className="px-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold">{user.displayName || "Settings"}</CardTitle>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(updateProfileMutation.mutate)} className="space-y-3">
                {/* Basic Information - Always Available */}
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <div className="relative">
                            <Textarea
                              {...field}
                              value={field.value || ''}
                              placeholder="Add your custom greeting here (max 140 characters)"
                              className="resize-none h-20 min-h-[80px] border-0 text-base px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-inherit"
                              maxLength={140}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                              {(field.value?.length || 0)}/140
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  {!hasActiveSubscription ? (
                    <Card className="border-2 border-dashed">
                      <CardContent className="py-8">
                        <div className="text-center space-y-4">
                          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Paid Members Only</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                              Upgrade your account to unlock additional premium profile features including company details,
                              location, contact information, and custom links.
                            </p>
                            <Button onClick={startSubscription} className="mt-4 bg-[#FEA30E] hover:bg-[#FEA30E]/90 text-black">
                              Upgrade to Premium
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Premium Features */}
                      {/* Company Information */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Company Information</h3>

                        <FormField
                          control={form.control}
                          name="featuredImageUrl"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-sm text-muted-foreground">Featured Image</FormLabel>
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

                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Company name"
                                  className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="companyDescription"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe your company..."
                                  className="resize-none min-h-[100px] border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-sm text-muted-foreground">Location</FormLabel>
                              <FormControl>
                                <LocationPicker
                                  defaultValue={field.value}
                                  onLocationSelect={field.onChange}
                                  className="w-full [&_.combobox-input]:border-0 [&_.combobox-input]:bg-muted/50 [&_.combobox-input]:focus-visible:ring-0 [&_.combobox-input]:focus-visible:ring-offset-0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="Phone number"
                                    className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="isPhonePublic"
                            render={({ field }) => (
                              <FormItem className="space-y-0 pt-2">
                                <FormControl>
                                  <div className="space-y-0.5">
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <span className="text-sm text-muted-foreground block">Public</span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                          <FormField
                            control={form.control}
                            name="isEmailPublic"
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <div className="space-y-0.5">
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <span className="text-sm text-muted-foreground block">Public</span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm text-muted-foreground">Tags</FormLabel>
                          <span className="text-sm text-muted-foreground">
                            {tags.length}/5 tags
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                            {tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="gap-1 h-7">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <Command className="rounded-lg overflow-visible border-0">
                            <CommandInput
                              placeholder="Add tags..."
                              value={currentTag}
                              onValueChange={setCurrentTag}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && currentTag.trim()) {
                                  e.preventDefault();
                                  handleSelectTag(currentTag);
                                }
                              }}
                              className="border-0 focus:ring-0 focus-visible:ring-0"
                            />
                          </Command>
                        </div>
                      </div>

                      {/* Custom Links */}
                      <FormField
                        control={form.control}
                        name="customLinks"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm text-muted-foreground">Custom Links</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (field.value.length >= 5) {
                                    toast({
                                      title: "Error",
                                      description: "Maximum 5 custom links allowed",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  field.onChange([...field.value, { title: "", url: "" }]);
                                }}
                                disabled={field.value.length >= 5}
                                className="h-8"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Link
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {field.value.map((link, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                  <div className="flex-1 flex gap-2">
                                    <Input
                                      placeholder="Link title"
                                      value={link.title}
                                      onChange={(e) => {
                                        const newLinks = [...field.value];
                                        newLinks[index] = { ...newLinks[index], title: e.target.value };
                                        field.onChange(newLinks);
                                      }}
                                      className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                    <Input
                                      placeholder="https://..."
                                      type="url"
                                      value={link.url}
                                      onChange={(e) => {
                                        const newLinks = [...field.value];
                                        newLinks[index] = { ...newLinks[index], url: e.target.value };
                                        field.onChange(newLinks);
                                      }}
                                      className="border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newLinks = [...field.value];
                                      newLinks.splice(index, 1);
                                      field.onChange(newLinks);
                                    }}
                                    className="h-9 w-9"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>

                {hasActiveSubscription && !user?.isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/stripe/create-portal-session', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        });

                        if (!response.ok) {
                          throw new Error('Failed to create portal session');
                        }

                        const { url } = await response.json();
                        if (!url) {
                          throw new Error('No portal URL received');
                        }

                        window.location.href = url;
                      } catch (error) {
                        console.error('Error accessing customer portal:', error);
                        toast({
                          title: "Error",
                          description: "Failed to access subscription management. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Manage Subscription
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}