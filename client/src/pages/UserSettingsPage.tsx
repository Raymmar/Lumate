import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Mail, ExternalLink, Lock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { type UpdateUserProfile, updateUserProfileSchema } from "@shared/schema";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Monitor } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    mode: "onBlur",
    reValidateMode: "onBlur",
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
        address: user.address || null,
        phoneNumber: user.phoneNumber || "",
        isPhonePublic: user.isPhonePublic || false,
        isEmailPublic: user.isEmailPublic || false,
        ctaText: user.ctaText || "",
        customLinks: user.customLinks || [],
        tags: user.tags || [],
      });
    }
  }, [user, form.reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const formattedData = {
        ...data,
        displayName: user?.displayName,
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
      console.error("Form submission error:", error);
    }
  });

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
                {/* Basic Information - Bio Field */}
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <FormLabel className="text-sm text-muted-foreground">
                            {!isSubscriptionLoading && !hasActiveSubscription && user ? (
                              <span>
                                Add a short bio to your public profile <span className="text-muted-foreground italic text-xs">(upgrade to add company details)</span>
                              </span>
                            ) : (
                              <span>Add a short bio to your public profile</span>
                            )}
                          </FormLabel>
                          {!isSubscriptionLoading && (
                            hasActiveSubscription ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Premium
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                Free
                              </span>
                            )
                          )}
                        </div>
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

                {/* Save Button */}
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
                
                {/* Company Profile Section - Moved below save button */}
                <div className="space-y-3">
                  <div className="pt-4 text-center">
                    {isSubscriptionLoading ? (
                      <div className="flex justify-center mb-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasActiveSubscription ? (
                      <>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => window.location.href = '/company-profile'}
                          className="w-full mb-4"
                        >
                          Edit Company Profile
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Company profiles are available for premium members
                        </p>
                      </div>
                    )}
                  </div>
                </div>

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
                
                {/* Subscription Management Button */}
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
                            credentials: "include",
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to create portal session");
                        }

                        const { url } = await response.json();
                        window.location.href = url;
                      } catch (error) {
                        console.error("Error creating portal session:", error);
                        toast({
                          title: "Error",
                          description:
                            "Failed to access subscription management. Please try again later.",
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