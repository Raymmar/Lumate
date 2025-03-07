import { useToast } from "@/hooks/use-toast";
import type { User, Role, Person } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { useState } from "react";
import { RelatedPeople } from "./RelatedPeople";

interface MemberPreviewProps {
  member: User & { roles?: Role[]; person?: Person | null };
  members?: (User & { roles?: Role[]; person?: Person | null })[];
  onNavigate?: (member: User & { roles?: Role[]; person?: Person | null }) => void;
}

export function MemberPreview({ member, members = [], onNavigate }: MemberPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const initials =
    member.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("") || member.email[0].toUpperCase();
  const [roles, setRoles] = useState<Role[]>(member.roles || []);

  // Find current member index and determine if we have prev/next
  const currentIndex = members.findIndex(m => m.id === member.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < members.length - 1;

  const handleAdminToggle = async (checked: boolean) => {
    try {
      await apiRequest(
        `/api/admin/members/${member.id}/admin-status`,
        "PATCH",
        { isAdmin: checked },
      );

      // Invalidate the members cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });

      toast({
        title: "Success",
        description: `Admin status ${checked ? "granted to" : "revoked from"} ${member.displayName || member.email}`,
      });
    } catch (error) {
      console.error("Failed to update admin status:", error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (roleName: string) => {
    try {
      const result = await apiRequest<{ roles: Role[] }>(
        `/api/admin/members/${member.id}/roles/${roleName}`,
        "POST",
      );

      if (result.roles) {
        setRoles(result.roles);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });

        toast({
          title: "Success",
          description: `Updated roles for ${member.displayName || member.email}`,
        });
      }
    } catch (error) {
      console.error("Failed to update user roles:", error);
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive",
      });
    }
  };

  const handleNavigate = (nextMember: User & { roles?: Role[]; person?: Person | null }) => {
    if (onNavigate) {
      onNavigate(nextMember);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">
            {member.displayName || "No display name"}
          </h2>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant={member.isVerified ? "default" : "secondary"}>
          {member.isVerified ? "Verified" : "Pending"}
        </Badge>
        {member.isAdmin && <Badge variant="default">Admin</Badge>}
        {roles.map((role) => (
          <Badge key={role.id} variant="outline">
            {role.name}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-medium">Member Information</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Member since</span>
            <span>{format(new Date(member.createdAt), "PPP")}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="admin-mode"
              checked={member.isAdmin}
              onCheckedChange={handleAdminToggle}
            />
            <Label htmlFor="admin-mode">Admin privileges</Label>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              onValueChange={handleRoleChange}
              defaultValue={roles[0]?.name || "User"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Moderator">Moderator</SelectItem>
                <SelectItem value="Sponsor">Sponsor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-medium">Linked Luma Profile</h3>
        </CardHeader>
        <CardContent>
          <RelatedPeople person={member.person} />
        </CardContent>
      </Card>

      {/* Navigation Section - Fixed to bottom */}
      {members.length > 1 && onNavigate && (
        <div className="sticky bottom-0 inset-x-0 -mx-6 mt-6 border-t bg-background">
          <div className="px-6 py-4 flex justify-between items-center">
            <Button
              variant="ghost"
              disabled={!hasPrevious}
              onClick={() => handleNavigate(members[currentIndex - 1])}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={!hasNext}
              onClick={() => handleNavigate(members[currentIndex + 1])}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}