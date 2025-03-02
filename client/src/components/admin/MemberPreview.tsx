import { useToast } from "@/hooks/use-toast";
import type { User, Role } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { useState } from "react";

interface MemberPreviewProps {
  member: User & { roles?: Role[] };
}

export function MemberPreview({ member }: MemberPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const initials = member.displayName?.split(' ').map(n => n[0]).join('') || member.email[0].toUpperCase();
  const [roles, setRoles] = useState<Role[]>(member.roles || []);

  const handleAdminToggle = async (checked: boolean) => {
    try {
      await apiRequest(
        `/api/admin/members/${member.id}/admin-status`,
        'PATCH',
        { isAdmin: checked }
      );

      // Invalidate the members cache to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });

      toast({
        title: "Success",
        description: `Admin status ${checked ? 'granted to' : 'revoked from'} ${member.displayName || member.email}`,
      });
    } catch (error) {
      console.error('Failed to update admin status:', error);
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
        'POST'
      );

      if (result.roles) {
        setRoles(result.roles);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });

        toast({
          title: "Success",
          description: `Updated roles for ${member.displayName || member.email}`,
        });
      }
    } catch (error) {
      console.error('Failed to update user roles:', error);
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{member.displayName || 'No display name'}</h2>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant={member.isVerified ? "default" : "secondary"}>
          {member.isVerified ? "Verified" : "Pending"}
        </Badge>
        {member.isAdmin && (
          <Badge variant="default">Admin</Badge>
        )}
        {roles.map((role) => (
          <Badge key={role.id} variant="outline">{role.name}</Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-medium">Member Information</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Member since</span>
            <span>{format(new Date(member.createdAt), 'PPP')}</span>
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
            <Select onValueChange={handleRoleChange} defaultValue={roles[0]?.name || "User"}>
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
    </div>
  );
}