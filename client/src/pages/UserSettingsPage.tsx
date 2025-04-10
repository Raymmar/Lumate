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
  Lock,
  AlertCircle,
  User,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Command, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type UpdateUserProfile,
  type Location,
  updateUserProfileSchema,
} from "@shared/schema";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function UserSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  useEffect(() => {
    initGoogleMaps();
  }, []);

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
    },
    mode: "onBlur", // Only validate when user leaves a field
    reValidateMode: "onBlur", // Re-validate on blur instead of every change
  });

  // Update form values when user data is available
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        bio: user.bio || "",
        featuredImageUrl: user.featuredImageUrl || "",
        companyName: user.companyName || "",
        companyDescription: user.companyDescription || "",
        address: user.address
          ? ((typeof user.address === "string"
              ? { address: user.address }
              : user.address) as Location)
          : null,
        phoneNumber: user.phoneNumber || "",
        isPhonePublic: user.isPhonePublic || false,
        isEmailPublic: user.isEmailPublic || false,
        ctaText: user.ctaText || "",
        customLinks: user.customLinks || [],
        tags: user.tags || [],
      });
      setTags(user.tags || []);
    }
  }, [user, form.reset]);

  // Enhanced subscription status check with proper typing
  const { data: subscriptionStatus, isLoading: isSubscriptionLoading } =
    useQuery({
      queryKey: ["/api/subscription/status"],
      queryFn: async () => {
        const response = await fetch("/api/subscription/status");
        if (!response.ok)
          throw new Error("Failed to fetch subscription status");
        const data = await response.json();
        return data as { status: string };
      },
      enabled: !!user && !user.isAdmin,
      // Reduce stale time to ensure fresh data after payment
      staleTime: 0,
      // Add retry for better reliability
      retry: 3,
    });

  const hasActiveSubscription =
    user?.isAdmin || subscriptionStatus?.status === "active";

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const formattedData = {
        ...data,
        displayName: user?.displayName,
        address: data.address || null,
        tags: tags,
        bio: data.bio || "",
      };

      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        description: "Profile updated successfully",
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
      await updateProfileMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in mutation's onError
      console.error("Form submission error:", error);
    }
  });

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
        throw new Error("No portal URL received");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Subscription error:", error);
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
    setTags(tags.filter((tag) => tag !== tagToRemove));
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
                {user?.displayName || "Settings"}
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
            <TooltipProvider>
              {/* Luma Profile Information Card */}
              <Card className="mb-6 overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <CardHeader className="px-4 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium">
                            Profile Details
                          </h3>
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://lu.ma/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Lu.ma</span>
                          </a>
                        </Button>
                      </CardHeader>
                      <CardContent className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {(user.displayName || user.email)
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {user.displayName || "User"}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="w-80 p-3">
                    <div className="text-sm">
                      <p className="font-medium mb-1">
                        Lu.ma-Managed Information
                      </p>
                      <p>
                        Your display name, profile picture, and email address
                        are managed through Lu.ma. To update these fields,
                        please visit your{" "}
                        <a
                          href="https://lu.ma/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline hover:text-amber-600"
                        >
                          Lu.ma settings
                        </a>
                        .
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </Card>
            </TooltipProvider>

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-3">
                {/* Basic Information - Always Available */}
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-sm text-muted-foreground">
                          Bio
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="Add your custom greeting here (max 140 characters)"
                              className="resize-none h-20 min-h-[80px] border bg-muted/50 text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-inherit"
                              maxLength={140}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                              {field.value?.length || 0}/140
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
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
                              profile features including company details,
                              location, contact information, and custom links.
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
                    <>
                      {/* Company Information */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">
                          Company Information
                        </h3>

                        <FormField
                          control={form.control}
                          name="featuredImageUrl"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <div>
                                <FormLabel className="text-sm text-muted-foreground">
                                  Featured Image
                                </FormLabel>
                                <p className="text-sm text-muted-foreground mt-1">
                                  This image will be displayed as a banner at
                                  the top of your company profile
                                </p>
                              </div>
                              <FormControl>
                                <UnsplashPicker
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  className="min-h-[300px]"
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
                                  className="border bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                                  className="resize-none min-h-[100px] border bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                              <FormLabel className="text-sm text-muted-foreground">
                                Location
                              </FormLabel>
                              <FormControl>
                                <LocationPicker
                                  defaultValue={field.value}
                                  onLocationSelect={field.onChange}
                                  className="w-full [&_.combobox-input]:border [&_.combobox-input]:bg-muted/50 [&_.combobox-input]:focus-visible:ring-0 [&_.combobox-input]:focus-visible:ring-offset-0"
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
                                    className={cn(
                                      "border bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0",
                                      form.formState.errors.phoneNumber &&
                                        form.getFieldState("phoneNumber")
                                          .isTouched &&
                                        "border-destructive",
                                    )}
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
                                    <span className="text-sm text-muted-foreground block">
                                      Public
                                    </span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <FormLabel className="text-sm text-muted-foreground">
                              Email Privacy
                            </FormLabel>
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
                                    <span className="text-sm text-muted-foreground block">
                                      Public
                                    </span>
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
                          <FormLabel className="text-sm text-muted-foreground">
                            Tags
                          </FormLabel>
                          <span className="text-sm text-muted-foreground">
                            {tags.length}/5 tags
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                            {tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 h-7"
                              >
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
                                if (e.key === "Enter" && currentTag.trim()) {
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
                              <FormLabel className="text-sm text-muted-foreground">
                                Custom Links
                              </FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentLinks = field.value || [];
                                  if (currentLinks.length >= 5) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "Maximum 5 custom links allowed",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  field.onChange([
                                    ...currentLinks,
                                    { title: "", url: "" },
                                  ]);
                                }}
                                disabled={field.value?.length >= 5}
                                className="h-8"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Link
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {field.value?.map((link, index) => (
                                <div
                                  key={index}
                                  className="flex gap-2 items-start"
                                >
                                  <div className="flex-1 flex gap-2">
                                    <div className="flex-1">
                                      <Input
                                        placeholder="Link title"
                                        value={link.title}
                                        onChange={(e) => {
                                          const newLinks = [
                                            ...(field.value || []),
                                          ];
                                          newLinks[index] = {
                                            ...newLinks[index],
                                            title: e.target.value,
                                          };
                                          field.onChange(newLinks);
                                        }}
                                        className={cn(
                                          "border bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0",
                                          form.formState.errors.customLinks?.[
                                            index
                                          ]?.title &&
                                            form.getFieldState(
                                              `customLinks.${index}.title`,
                                            ).isTouched &&
                                            "border-destructive",
                                        )}
                                      />
                                      {form.formState.errors.customLinks?.[
                                        index
                                      ]?.title &&
                                        form.getFieldState(
                                          `customLinks.${index}.title`,
                                        ).isTouched && (
                                          <p className="text-sm text-destructive mt-1">
                                            {
                                              form.formState.errors.customLinks[
                                                index
                                              ]?.title?.message
                                            }
                                          </p>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                      <Input
                                        placeholder="https://..."
                                        type="url"
                                        value={link.url}
                                        onChange={(e) => {
                                          const newLinks = [
                                            ...(field.value || []),
                                          ];
                                          newLinks[index] = {
                                            ...newLinks[index],
                                            url: e.target.value,
                                          };
                                          field.onChange(newLinks);
                                        }}
                                        className={cn(
                                          "border bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0",
                                          form.formState.errors.customLinks?.[
                                            index
                                          ]?.url &&
                                            form.getFieldState(
                                              `customLinks.${index}.url`,
                                            ).isTouched &&
                                            "border-destructive",
                                        )}
                                      />
                                      {form.formState.errors.customLinks?.[
                                        index
                                      ]?.url &&
                                        form.getFieldState(
                                          `customLinks.${index}.url`,
                                        ).isTouched && (
                                          <p className="text-sm text-destructive mt-1">
                                            {
                                              form.formState.errors.customLinks[
                                                index
                                              ]?.url?.message
                                            }
                                          </p>
                                        )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newLinks = [...(field.value || [])];
                                      newLinks.splice(index, 1);
                                      field.onChange(newLinks);
                                      // Trigger form revalidation after removing a link
                                      form.trigger("customLinks");
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
                  disabled={
                    updateProfileMutation.isPending ||
                    (form.formState.isSubmitted && !form.formState.isValid)
                  }
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

                {form.formState.isSubmitted &&
                  Object.keys(form.formState.errors).length > 0 && (
                    <div className="mt-4 p-4 border border-red-200 rounded-md bg-red-50">
                      <p className="text-sm font-medium text-red-800">
                        Please fix the following errors:
                      </p>
                      <ul className="mt-2 text-sm text-red-700">
                        {Object.entries(form.formState.errors).map(
                          ([field, error]) => (
                            <li key={field}>
                              {field.charAt(0).toUpperCase() + field.slice(1)}:{" "}
                              {error?.message}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                {hasActiveSubscription && !user?.isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          "/api/stripe/create-portal-session",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                          },
                        );

                        if (!response.ok) {
                          throw new Error("Failed to create portal session");
                        }

                        const { url } = await response.json();
                        if (!url) {
                          throw new Error("No portal URL received");
                        }

                        window.location.href = url;
                      } catch (error) {
                        console.error(
                          "Error accessing customer portal:",
                          error,
                        );
                        toast({
                          title: "Error",
                          description:
                            "Failed to access subscription management. Please try again.",
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
