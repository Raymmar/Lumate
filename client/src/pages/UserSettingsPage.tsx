import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSummitTicket } from "@/hooks/use-summit-ticket";
import { CurrentSummitTicket } from "@/components/memberships/CurrentSummitTicket";
import { couponRegistrationUrl, isUsableTicketCoupon } from "@shared/summitTicket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, AlertTriangle, Mail, ExternalLink, Lock, Ticket, Copy, Check, Link2, Unlink, Star, Plus, Camera, Pencil, ArrowRight, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface LinkedPerson {
  id: number;
  fullName: string | null;
  email: string;
  isPrimary: boolean;
  linkedAt: string;
}

export default function UserSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const linkedProfiles: LinkedPerson[] = (user as any)?.linkedProfiles || [];
  const isLoadingProfiles = false;
  const emailDriftDetectedAt = (user as any)?.emailDriftDetectedAt || null;
  const emailDriftPersonEmail = (user as any)?.emailDriftPersonEmail || null;

  const resolveDriftMutation = useMutation({
    mutationFn: async (action: "update-email" | "link-both" | "dismiss") => {
      return await apiRequest("/api/user/resolve-drift", "POST", { action });
    },
    onSuccess: (_data, action) => {
      const messages: Record<string, string> = {
        "update-email": "Your email has been updated to match your Luma profile",
        "link-both": "Both email profiles have been linked to your account",
        "dismiss": "Email drift alert dismissed",
      };
      toast({ title: "Resolved", description: messages[action] || "Drift resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to resolve", variant: "destructive" });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/users/link-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link profile");
      return data;
    },
    onSuccess: (data) => {
      if (data.pendingVerification) {
        toast({ title: "Verification email sent", description: "Check your inbox and click the link to confirm this profile." });
      } else {
        toast({ title: "Profile linked successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/users/linked-profiles"] });
      }
      setLinkEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (personId: number) => {
      const res = await fetch(`/api/users/unlink-profile/${personId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unlink profile");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Profile unlinked" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (personId: number) => {
      const res = await fetch(`/api/users/set-primary-profile/${personId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set primary");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Primary profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload/file", { method: "POST", credentials: "include", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const url = uploadData?.url;
      if (!url) throw new Error("No image URL returned from upload");

      form.setValue("avatarUrl", url);
      const currentValues = form.getValues();
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...currentValues, avatarUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to save profile image");
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], (old: any) => ({
        ...old, ...data, linkedProfiles: data.linkedProfiles || old?.linkedProfiles || [],
      }));
      toast({ title: "Profile picture updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleNameSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Display name cannot be empty", variant: "destructive" });
      return;
    }
    try {
      const currentValues = form.getValues();
      form.setValue("displayName", trimmed);
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...currentValues, displayName: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], (old: any) => ({
        ...old, ...data, linkedProfiles: data.linkedProfiles || old?.linkedProfiles || [],
      }));
      setIsEditingName(false);
      toast({ title: "Display name updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update name", variant: "destructive" });
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === (user as any)?.slug) {
      setSlugError(null);
      setSlugAvailable(null);
      return;
    }
    const formatted = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    if (formatted.length < 2) {
      setSlugError("Must be at least 2 characters");
      setSlugAvailable(null);
      return;
    }
    setIsCheckingSlug(true);
    try {
      const res = await fetch(`/api/user/check-slug/${encodeURIComponent(formatted)}`);
      const data = await res.json();
      setSlugAvailable(data.available);
      setSlugError(data.available ? null : "This URL is already taken");
    } catch {
      setSlugError("Could not check availability");
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugSave = async () => {
    const formatted = editSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    if (formatted.length < 2) {
      toast({ title: "Error", description: "Profile URL must be at least 2 characters", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/user/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: formatted }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile URL");
      }
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], (old: any) => ({
        ...old, slug: data.slug,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      setIsEditingSlug(false);
      setSlugError(null);
      setSlugAvailable(null);
      toast({ title: "Profile URL updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update profile URL", variant: "destructive" });
    }
  };

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

  const { claim, coupons: couponQuery } = useSummitTicket();
  const { data: couponsData, isLoading: isLoadingCoupons } = couponQuery;
  const otherCoupons = couponQuery.isError ? [] : (couponsData?.coupons ?? []).filter(c => c.eventApiId !== claim?.eventApiId);

  const copyToClipboard = async (text: string, isLink: boolean = false) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied",
      description: isLink ? "Registration link copied to clipboard" : "Coupon code copied to clipboard",
    });
  };

  const form = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: "",
      avatarUrl: "",
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
        avatarUrl: user.avatarUrl || "",
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
        displayName: data.displayName || user?.displayName || "",
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
      queryClient.setQueryData(["/api/auth/me"], (old: any) => ({
        ...old,
        ...data,
        linkedProfiles: data.linkedProfiles || old?.linkedProfiles || [],
      }));
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
    <DashboardLayout aboveLayout={<CurrentSummitTicket claimOnly />}>
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
              {/* Profile Details & Linked Luma Profiles */}
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="px-4 pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium">
                      Profile Details
                    </h3>
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
                <CardContent className="px-4 py-3 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="h-14 w-14">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.displayName || "Profile"} />
                        ) : null}
                        <AvatarFallback className="text-lg">
                          {(user.displayName || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        htmlFor="avatar-upload"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleNameSave();
                              if (e.key === "Escape") setIsEditingName(false);
                            }}
                            className="h-8 text-sm font-medium"
                            autoFocus
                          />
                          <Button size="sm" className="h-8" onClick={handleNameSave}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsEditingName(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.displayName || "Set your name"}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            onClick={() => { setEditName(user.displayName || ""); setIsEditingName(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
                        <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {isEditingSlug ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">/people/</span>
                            <Input
                              value={editSlug}
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                setEditSlug(val);
                                checkSlugAvailability(val);
                              }}
                              className="h-7 text-sm font-mono px-1.5 max-w-[160px]"
                              autoFocus
                            />
                            {isCheckingSlug && <Loader2 className="h-3 w-3 animate-spin" />}
                            {slugAvailable === true && <Check className="h-3 w-3 text-green-500" />}
                            {slugError && <span className="text-xs text-destructive whitespace-nowrap">{slugError}</span>}
                            <Button size="sm" className="h-7 text-xs" onClick={handleSlugSave} disabled={!!slugError || isCheckingSlug}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIsEditingSlug(false); setSlugError(null); setSlugAvailable(null); }}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="truncate font-mono text-xs">/people/{(user as any)?.slug || "..."}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                              onClick={() => { setEditSlug((user as any)?.slug || ""); setIsEditingSlug(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio Form */}
                  <div className="pt-3">
                    <Form {...form}>
                      <form onSubmit={onSubmit} className="space-y-3">
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
                      </form>
                    </Form>
                  </div>

                  {/* Email Drift Alert */}
                  {emailDriftDetectedAt && emailDriftPersonEmail && (
                    <div className="border-t pt-3">
                      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm mb-1">
                              Email Mismatch Detected
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                              Your linked Luma profile email changed to <strong>{emailDriftPersonEmail}</strong>, but your account email is still <strong>{user?.email}</strong>.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => resolveDriftMutation.mutate("update-email")}
                                disabled={resolveDriftMutation.isPending}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Update my email
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => resolveDriftMutation.mutate("link-both")}
                                disabled={resolveDriftMutation.isPending}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Link both
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => resolveDriftMutation.mutate("dismiss")}
                                disabled={resolveDriftMutation.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Luma Profiles */}
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium flex items-center gap-1">
                            Linked Lu.ma Profiles
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="w-72 p-3">
                          <div className="text-sm">
                            <p className="font-medium mb-1">Lu.ma Event Profiles</p>
                            <p>These are your linked Lu.ma profiles used for event check-ins and membership sync. Your display name and profile picture are managed above.</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {isLoadingProfiles ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : linkedProfiles && linkedProfiles.length > 0 ? (
                      <div className="space-y-2">
                        {linkedProfiles.map((profile) => (
                          <div
                            key={profile.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {(profile.fullName || profile.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {profile.fullName || profile.email}
                                </p>
                                {profile.fullName && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {profile.email}
                                  </p>
                                )}
                              </div>
                              {profile.isPrimary && (
                                <Badge variant="secondary" className="shrink-0 text-xs py-0">
                                  <Star className="h-3 w-3 mr-0.5" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {!profile.isPrimary && linkedProfiles.length > 1 && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setPrimaryMutation.mutate(profile.id)}
                                    disabled={setPrimaryMutation.isPending}
                                    title="Set as primary"
                                  >
                                    <Star className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => unlinkMutation.mutate(profile.id)}
                                    disabled={unlinkMutation.isPending}
                                    title="Unlink profile"
                                  >
                                    <Unlink className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">
                        No Lu.ma profiles linked yet. If you've attended our events, link your profile below.
                      </p>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (linkEmail) linkMutation.mutate(linkEmail);
                      }}
                      className="flex gap-2 mt-3"
                    >
                      <div className="flex-1">
                        <Label htmlFor="link-email" className="sr-only">Email</Label>
                        <Input
                          id="link-email"
                          type="email"
                          value={linkEmail}
                          onChange={(e) => setLinkEmail(e.target.value)}
                          placeholder={linkedProfiles && linkedProfiles.length > 0 ? "Link additional Lu.ma profile by email" : "Link your Lu.ma profile by email"}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={linkMutation.isPending || !linkEmail}
                        size="sm"
                        className="h-8"
                      >
                        {linkMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1">Link</span>
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>

            {/* Company Profile Section */}
            <div className="space-y-3">
              <div className="pt-4 text-center">
                {isSubscriptionLoading ? (
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : hasActiveSubscription ? (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/company-profile'}
                    className="w-full mb-4"
                  >
                    Edit Company Profile
                  </Button>
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

            {/* Event Coupons Section */}
            {(hasActiveSubscription || otherCoupons.length > 0) && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Ticket className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Your Event Coupons</h3>
                  {otherCoupons.some(c => c.status === "issued") && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      New
                    </span>
                  )}
                </div>
                
                {isLoadingCoupons ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : couponQuery.isError ? (
                  <p role="alert">Couldn't load your coupons. <Button variant="link" onClick={() => { void couponQuery.refetch(); }}>Try again</Button></p>
                ) : otherCoupons.length > 0 ? (
                  <div className="space-y-3">
                    {otherCoupons.map((coupon) => {
                      const couponLink = isUsableTicketCoupon(coupon) ? couponRegistrationUrl(coupon.eventUrl, coupon.code) : null;
                      return (
                        <div 
                          key={coupon.id} 
                          className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
                          data-testid={`coupon-card-${coupon.id}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate">{coupon.eventTitle}</p>
                              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                {coupon.discountPercent}% discount
                                {coupon.validEndAt && <span className="text-muted-foreground font-normal"> • Expires {new Date(coupon.validEndAt).toLocaleDateString()}</span>}
                              </p>
                            </div>
                            <Ticket className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                          </div>
                          
                          {couponLink ? (
                            <div className="space-y-2">
                              <a 
                                href={couponLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                                data-testid={`link-use-coupon-${coupon.id}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                                Click to Register with Discount
                              </a>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => copyToClipboard(couponLink, true)}
                                data-testid={`button-copy-link-${coupon.id}`}
                              >
                                {copiedCode === couponLink ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    Link Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Registration Link
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono text-center">
                                {coupon.code}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(coupon.code)}
                                data-testid={`button-copy-coupon-${coupon.id}`}
                              >
                                {copiedCode === coupon.code ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Click the button above to register with your discount already applied
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>No coupons available yet.</p>
                    <p className="text-xs mt-1">Check back before upcoming events!</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Subscription Management Button */}
            {hasActiveSubscription && !user?.isAdmin && (
              <Button
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
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}