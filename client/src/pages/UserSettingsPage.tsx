import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AdminBadge } from "@/components/AdminBadge";
import { useTheme } from "@/hooks/use-theme";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { type UpdateUserProfile, type Location } from "@shared/schema";
import { LocationPicker } from "@/components/ui/location-picker";
import { initGoogleMaps } from "@/lib/google-maps";

export default function UserSettingsPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Fetch fresh user data from the server
  const { data: user, isLoading } = useQuery<UpdateUserProfile>({
    queryKey: ['/api/auth/me'],
    enabled: !!authUser, // Only fetch if user is authenticated
    staleTime: 0 // Always fetch fresh data
  });

  // Form state
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
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);

  // Update form state when user data is loaded
  useEffect(() => {
    if (user) {
      console.log('Setting form data from user:', user);

      // Parse address if it's a string
      let parsedAddress: Location | null = null;
      try {
        if (user.address) {
          parsedAddress = typeof user.address === 'string' 
            ? JSON.parse(user.address) 
            : user.address;
        }
      } catch (e) {
        console.error('Error parsing address:', e);
      }

      // Set form values from user data
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setFeaturedImageUrl(user.featuredImageUrl || "");
      setCompanyName(user.companyName || "");
      setCompanyDescription(user.companyDescription || "");
      setAddress(parsedAddress);
      setPhoneNumber(user.phoneNumber || "");
      setIsPhonePublic(Boolean(user.isPhonePublic));
      setIsEmailPublic(Boolean(user.isEmailPublic));
      setCtaText(user.ctaText || "");

      // Handle arrays with null checks
      setCustomLinks(Array.isArray(user.customLinks) ? user.customLinks : []);
      setTags(Array.isArray(user.tags) ? user.tags : []);
    }
  }, [user]);

  useEffect(() => {
    initGoogleMaps();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      console.log('Submitting profile update:', data);
      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          // Ensure address is stringified before sending
          address: data.address ? JSON.stringify(data.address) : null
        }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting form with data:', {
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

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
            {user.isAdmin && <AdminBadge />}
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

              {/* Tags Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Tags</h3>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-secondary rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter(t => t !== tag))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
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
                          if (!tags.includes(currentTag.toLowerCase())) {
                            setTags([...tags, currentTag.toLowerCase()]);
                            setCurrentTag("");
                          }
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
                    onClick={() => setCustomLinks([...customLinks, { title: "", url: "" }])}
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
                          onChange={(e) => {
                            const newLinks = [...customLinks];
                            newLinks[index] = { ...link, title: e.target.value };
                            setCustomLinks(newLinks);
                          }}
                        />
                        <Input
                          placeholder="URL"
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...customLinks];
                            newLinks[index] = { ...link, url: e.target.value };
                            setCustomLinks(newLinks);
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCustomLinks(customLinks.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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