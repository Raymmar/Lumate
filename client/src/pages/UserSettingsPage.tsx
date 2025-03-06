import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AdminBadge } from "@/components/AdminBadge";
import { useTheme } from "@/hooks/use-theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { type UpdateUserProfile, type Location } from "@shared/schema";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";

export default function UserSettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(user?.featuredImageUrl ?? "");
  const [companyName, setCompanyName] = useState(user?.companyName ?? "");
  const [companyDescription, setCompanyDescription] = useState(user?.companyDescription ?? "");
  const [address, setAddress] = useState<Location | null>(user?.address as Location | null);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [isPhonePublic, setIsPhonePublic] = useState(user?.isPhonePublic ?? false);
  const [isEmailPublic, setIsEmailPublic] = useState(user?.isEmailPublic ?? false);
  const [ctaText, setCtaText] = useState(user?.ctaText ?? "");
  const [customLinks, setCustomLinks] = useState(user?.customLinks ?? []);
  const [tags, setTags] = useState<string[]>(user?.tags ?? []);
  const [currentTag, setCurrentTag] = useState("");
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setBio(user.bio ?? "");
      setFeaturedImageUrl(user.featuredImageUrl ?? "");
      setCompanyName(user.companyName ?? "");
      setCompanyDescription(user.companyDescription ?? "");
      setAddress(user.address as Location | null);
      setPhoneNumber(user.phoneNumber ?? "");
      setIsPhonePublic(user.isPhonePublic ?? false);
      setIsEmailPublic(user.isEmailPublic ?? false);
      setCtaText(user.ctaText ?? "");
      setCustomLinks(user.customLinks ?? []);
      setTags(user.tags ?? []);
    }
  }, [user]);

  useEffect(() => {
    // Initialize Google Maps when component mounts
    initGoogleMaps();
  }, []);

  const isAdmin = Boolean(user?.isAdmin);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      updateUser(data);
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

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="py-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your profile information
              </CardDescription>
            </div>
            {isAdmin && <AdminBadge />}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featuredImageUrl">Featured Image URL</Label>
                  <Input
                    id="featuredImageUrl"
                    type="url"
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Company Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Describe your company"
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <LocationPicker
                    defaultValue={address}
                    onLocationSelect={setAddress}
                    className="w-full"
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
                    <Label>Email Visibility</Label>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
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
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Tags</h3>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
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
                  <Command className="rounded-lg border">
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
                      className="border-0"
                    />
                  </Command>
                </div>
              </div>

              {/* Custom Links */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Custom Links</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomLink}
                    disabled={customLinks.length >= 5}
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
                        />
                        <Input
                          placeholder="URL"
                          type="url"
                          value={link.url}
                          onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCustomLink(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Selection */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Appearance</h3>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
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