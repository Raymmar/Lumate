import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, Star, Plus, Loader2 } from "lucide-react";

interface LinkedPerson {
  id: number;
  fullName: string | null;
  email: string;
  isPrimary: boolean;
  linkedAt: string;
}

export function LinkedProfilesSection() {
  const { toast } = useToast();
  const [linkEmail, setLinkEmail] = useState("");

  const { data: linkedProfiles, isLoading } = useQuery<LinkedPerson[]>({
    queryKey: ["/api/users/linked-profiles"],
  });

  const linkMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/users/link-profile", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile linked successfully" });
      setLinkEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/users/linked-profiles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (personId: number) => {
      const res = await apiRequest("DELETE", `/api/users/unlink-profile/${personId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile unlinked" });
      queryClient.invalidateQueries({ queryKey: ["/api/users/linked-profiles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (personId: number) => {
      const res = await apiRequest("POST", `/api/users/set-primary-profile/${personId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Primary profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/users/linked-profiles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Linked Luma Profiles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : linkedProfiles && linkedProfiles.length > 0 ? (
          <div className="space-y-2">
            {linkedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {profile.fullName || profile.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  </div>
                  {profile.isPrimary && (
                    <Badge variant="secondary" className="shrink-0">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!profile.isPrimary && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(profile.id)}
                        disabled={setPrimaryMutation.isPending}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkMutation.mutate(profile.id)}
                        disabled={unlinkMutation.isPending}
                        title="Unlink profile"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No Luma profiles linked yet. Link a profile by entering the email associated with your Luma account.
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (linkEmail) linkMutation.mutate(linkEmail);
          }}
          className="flex gap-2"
        >
          <div className="flex-1">
            <Label htmlFor="link-email" className="sr-only">
              Email
            </Label>
            <Input
              id="link-email"
              type="email"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              placeholder="Enter Luma profile email"
            />
          </div>
          <Button
            type="submit"
            disabled={linkMutation.isPending || !linkEmail}
            size="sm"
          >
            {linkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
