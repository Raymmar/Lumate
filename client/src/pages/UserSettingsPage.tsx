import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X, Lock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { type UpdateUserProfile, type Location } from "@shared/schema";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Monitor } from "lucide-react";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";

export default function UserSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [address, setAddress] = useState<Location | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [isEmailPublic, setIsEmailPublic] = useState(false);
  const [ctaText, setCtaText] = useState("");
  const [customLinks, setCustomLinks] = useState<Array<{ title: string; url: string }>>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");

  useEffect(() => {
    initGoogleMaps();
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setFeaturedImageUrl(user.featuredImageUrl || "");
      setCompanyName(user.companyName || "");
      setCompanyDescription(user.companyDescription || "");

      if (user.address) {
        const addressData = typeof user.address === 'string'
          ? { address: user.address }
          : user.address;
        setAddress(addressData as Location);
      } else {
        setAddress(null);
      }

      setPhoneNumber(user.phoneNumber || "");
      setIsPhonePublic(user.isPhonePublic || false);
      setIsEmailPublic(user.isEmailPublic || false);
      setCtaText(user.ctaText || "");
      setCustomLinks(user.customLinks || []);
      setTags(user.tags || []);
    }
  }, [user]);

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/status');
      if (!response.ok) throw new Error('Failed to fetch subscription status');
      return response.json();
    },
    enabled: !!user && !user.isAdmin, // Only check subscription for non-admin users
  });

  const hasActiveSubscription = user?.isAdmin || subscriptionStatus?.status === 'active';

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const formattedData = {
        ...data,
        address: data.address || null
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

  const startSubscription = async () => {
    try {
      console.log('Starting subscription process...');
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
        throw new Error('No checkout URL received');
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

  const handleAddCustomLink = () => {
    if (customLinks.length >= 5) {
      toast({
        title: "Error",
        description: "Maximum 5 custom links allowed",
        variant: "destructive",
      });
      return;
    }
    setCustomLinks([...customLinks, { title: "", url: "" }]);
  };

  const handleRemoveCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index));
  };

  const updateCustomLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...customLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setCustomLinks(newLinks);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        displayName,
        bio,
        featuredImageUrl,
        companyName,
        companyDescription,
        address,
        phoneNumber,
        isPhonePublic,
        isEmailPublic,
        ctaText,
        customLinks,
        tags,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
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
      <div className="container max-w-3xl mx-auto pt-3 pb-6">
        <Card className="border-none shadow-none">
          <CardHeader className="px-6 space-y-1">
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
            <CardDescription>
              Update your profile information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information - Always Available */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className="min-h-[100px] bg-background"
                  />
                </div>
              </div>

              {/* Premium Features Section */}
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
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Company Information</h3>
                    <div className="space-y-2">
                      <Label>Featured Image</Label>
                      <UnsplashPicker
                        value={featuredImageUrl}
                        onChange={setFeaturedImageUrl}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter your company name"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyDescription">Company Description</Label>
                      <Textarea
                        id="companyDescription"
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        placeholder="Describe your company"
                        className="min-h-[100px] bg-background"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <LocationPicker
                        defaultValue={address}
                        onLocationSelect={setAddress}
                        className="w-full [&_.combobox-input]:border-0 [&_.combobox-input]:bg-background [&_.combobox-input]:focus-visible:ring-0 [&_.combobox-input]:focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter your phone number"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2 pt-8">
                        <Switch
                          checked={isPhonePublic}
                          onCheckedChange={setIsPhonePublic}
                        />
                        <span className="text-sm text-muted-foreground block">Public</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>Email</Label>
                        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Switch
                          checked={isEmailPublic}
                          onCheckedChange={setIsEmailPublic}
                        />
                        <span className="text-sm text-muted-foreground block">Public</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <span className="text-sm text-muted-foreground">
                        {tags.length}/5 tags
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                        {tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="px-2 py-1 h-7">
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
                      <Command className="rounded-md border bg-background">
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
                          className="h-9"
                        />
                      </Command>
                    </div>
                  </div>

                  {/* Custom Links */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Custom Links</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomLink}
                        disabled={customLinks.length >= 5}
                        className="h-8"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Link
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {customLinks.map((link, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          <div className="flex-1 space-y-4">
                            <Input
                              placeholder="Link Title"
                              value={link.title}
                              onChange={(e) => updateCustomLink(index, 'title', e.target.value)}
                              className="bg-background"
                            />
                            <Input
                              placeholder="URL"
                              type="url"
                              value={link.url}
                              onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                              className="bg-background"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCustomLink(index)}
                            className="h-9 w-9"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
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
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}