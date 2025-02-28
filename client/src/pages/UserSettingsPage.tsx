import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type UpdateProfile, updateProfileSchema } from "@shared/schema";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function UserSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      website: user?.website || "",
      instagram: user?.instagram || "",
      youtube: user?.youtube || "",
      linkedin: user?.linkedin || "",
      shortBio: user?.shortBio || "",
      ctaLabel: user?.ctaLabel || "",
      ctaUrl: user?.ctaUrl || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const onSubmit = async (data: UpdateProfile) => {
    await updateProfileMutation.mutateAsync(data);
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="container max-w-2xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your profile information and social links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...form.register("displayName")}
                  aria-invalid={!!form.formState.errors.displayName}
                />
                {form.formState.errors.displayName && (
                  <p className="text-sm text-red-500">{form.formState.errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortBio">Short Bio</Label>
                <Textarea
                  id="shortBio"
                  {...form.register("shortBio")}
                  placeholder="Write a brief description about yourself"
                  className="h-24"
                />
                {form.formState.errors.shortBio && (
                  <p className="text-sm text-red-500">{form.formState.errors.shortBio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  {...form.register("website")}
                  placeholder="https://your-website.com"
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-red-500">{form.formState.errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram Username</Label>
                <Input
                  id="instagram"
                  {...form.register("instagram")}
                  placeholder="yourusername"
                />
                {form.formState.errors.instagram && (
                  <p className="text-sm text-red-500">{form.formState.errors.instagram.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube Channel</Label>
                <Input
                  id="youtube"
                  type="url"
                  {...form.register("youtube")}
                  placeholder="https://youtube.com/c/yourchannel"
                />
                {form.formState.errors.youtube && (
                  <p className="text-sm text-red-500">{form.formState.errors.youtube.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  type="url"
                  {...form.register("linkedin")}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {form.formState.errors.linkedin && (
                  <p className="text-sm text-red-500">{form.formState.errors.linkedin.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaLabel">Call to Action Button Label</Label>
                <Input
                  id="ctaLabel"
                  {...form.register("ctaLabel")}
                  placeholder="Connect with me"
                />
                {form.formState.errors.ctaLabel && (
                  <p className="text-sm text-red-500">{form.formState.errors.ctaLabel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ctaUrl">Call to Action URL</Label>
                <Input
                  id="ctaUrl"
                  type="url"
                  {...form.register("ctaUrl")}
                  placeholder="https://calendly.com/yourusername"
                />
                {form.formState.errors.ctaUrl && (
                  <p className="text-sm text-red-500">{form.formState.errors.ctaUrl.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
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