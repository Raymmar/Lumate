import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AdminBadge } from "@/components/AdminBadge";
import { useTheme } from "@/hooks/use-theme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

// Create a form schema based on the insertUserSchema
const formSchema = insertUserSchema.extend({
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function UserSettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isAdmin = Boolean(user?.isAdmin);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
      companyName: user?.companyName || "",
      companyDescription: user?.companyDescription || "",
      featuredImageUrl: user?.featuredImageUrl || "",
      phoneNumber: user?.phoneNumber || "",
      tags: user?.tags || [],
      ctaLink: user?.ctaLink || "",
      ctaText: user?.ctaText || "",
      customLinks: user?.customLinks || [],
      displayEmail: user?.displayEmail || false,
      displayPhone: user?.displayPhone || false,
      address: user?.address || {},
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log('Submitting form values:', values);
      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Update profile error response:', error);
        throw new Error(error.error || "Failed to update profile");
      }

      const data = await response.json();
      console.log('Update profile success:', data);
      return data;
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
      console.error('Update profile mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      console.log('Form submitted with values:', values);
      await updateProfileMutation.mutateAsync(values);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  if (!user) return null;

  const handleAddCustomLink = () => {
    const currentLinks = form.getValues("customLinks") || [];
    if (currentLinks.length >= 5) {
      toast({
        title: "Error",
        description: "Maximum 5 custom links allowed",
        variant: "destructive",
      });
      return;
    }

    form.setValue("customLinks", [
      ...currentLinks,
      { url: "", icon: "", name: "" }
    ]);
  };

  return (
    <DashboardLayout>
      <div className="py-6 max-w-2xl mx-auto space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your profile information</CardDescription>
                </div>
                {isAdmin && <AdminBadge />}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
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
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (max 3)</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {field.value?.map((tag, index) => (
                              <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded">
                                <span>{tag}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newTags = field.value?.filter((_, i) => i !== index);
                                    field.onChange(newTags);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {(field.value?.length || 0) < 3 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const tag = window.prompt("Enter a tag");
                                  if (tag && (!field.value || field.value.length < 3)) {
                                    field.onChange([...(field.value || []), tag]);
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Tag
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Call to Action */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ctaLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call to Action Link</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" value={field.value || ''} />
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
                        <FormLabel>Call to Action Text</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Custom Links */}
                <div className="space-y-4">
                  <Label>Custom Links (max 5)</Label>
                  <FormField
                    control={form.control}
                    name="customLinks"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-4">
                            {field.value?.map((link, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="Link Name"
                                  value={link.name}
                                  onChange={(e) => {
                                    const newLinks = [...field.value];
                                    newLinks[index] = { ...link, name: e.target.value };
                                    field.onChange(newLinks);
                                  }}
                                />
                                <Input
                                  placeholder="Icon"
                                  value={link.icon}
                                  onChange={(e) => {
                                    const newLinks = [...field.value];
                                    newLinks[index] = { ...link, icon: e.target.value };
                                    field.onChange(newLinks);
                                  }}
                                />
                                <Input
                                  type="url"
                                  placeholder="URL"
                                  value={link.url}
                                  onChange={(e) => {
                                    const newLinks = [...field.value];
                                    newLinks[index] = { ...link, url: e.target.value };
                                    field.onChange(newLinks);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newLinks = field.value.filter((_, i) => i !== index);
                                    field.onChange(newLinks);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {(field.value?.length || 0) < 5 && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddCustomLink}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Custom Link
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Display Email Publicly</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayPhone"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Display Phone Number Publicly</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
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
              </CardContent>
            </Card>
          </form>
        </Form>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the appearance of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme or sync with your system settings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}