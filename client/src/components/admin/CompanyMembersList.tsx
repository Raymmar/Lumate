import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { X, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyMember {
  id: number;
  companyId: number;
  userId: number;
  role: string;
  title: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isVerified: boolean;
    person?: {
      id: number;
      api_id: string;
      userName: string | null;
      fullName: string | null;
      jobTitle: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

interface CompanyMembersListProps {
  members: CompanyMember[];
  companyId: number;
  onMembersChanged?: () => void;
}

export function CompanyMembersList({ 
  members, 
  companyId,
  onMembersChanged
}: CompanyMembersListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Only admins can remove members
  const canManageMembers = user?.isAdmin;

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest<any>(`/api/companies/${companyId}/members/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the company',
      });
      
      if (onMembersChanged) {
        onMembersChanged();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      return apiRequest<any>(`/api/companies/${companyId}/members/${userId}`, 'PUT', { role });
    },
    onSuccess: () => {
      toast({
        title: 'Role updated',
        description: 'The member role has been updated',
      });
      
      if (onMembersChanged) {
        onMembersChanged();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  const handleRemoveMember = async (userId: number) => {
    await removeMemberMutation.mutateAsync(userId);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    await updateRoleMutation.mutateAsync({ userId, role: newRole });
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div 
          key={member.id} 
          className="flex items-center justify-between p-2 rounded-md border bg-card"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={member.user.avatarUrl || member.user.person?.avatarUrl || undefined} 
                alt={member.user.displayName || "Member"}
              />
              <AvatarFallback>
                {member.user.displayName ? member.user.displayName[0].toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="font-medium">
                {member.user.displayName || member.user.email}
              </div>
              {member.title && (
                <div className="text-sm text-muted-foreground">
                  {member.title}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Show owner badge with crown */}
            {member.role === 'owner' && (
              <Badge variant="default" className="gap-1">
                <Crown className="h-3 w-3" />
                Owner
              </Badge>
            )}
            
            {/* Role selector for system admins */}
            {canManageMembers && (
              <Select
                value={member.role}
                onValueChange={(newRole) => handleRoleChange(member.userId, newRole)}
                disabled={updateRoleMutation.isPending}
              >
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Show badge for non-admins */}
            {!canManageMembers && member.role === 'admin' && (
              <Badge variant="outline">Admin</Badge>
            )}
            {!canManageMembers && member.role === 'user' && (
              <Badge variant="secondary">User</Badge>
            )}
            
            {canManageMembers && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveMember(member.userId)}
                disabled={removeMemberMutation.isPending}
                data-testid={`button-remove-member-${member.userId}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}