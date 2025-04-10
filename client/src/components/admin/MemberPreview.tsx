import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  User as UserIcon,
  UserCog,
  UserCheck,
  UserX,
  Building,
  Tag,
  ExternalLink,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { User, Person, Badge as BadgeType } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Member extends User {
  person?: Person | null;
  badges?: BadgeType[];
}

interface MemberPreviewProps {
  member: Member;
  members?: Member[];
  onNavigate?: (member: Member) => void;
}

export function MemberPreview({ member, members = [], onNavigate }: MemberPreviewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentIndex = members.findIndex((m) => m.id === member.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < members.length - 1;

  const navigateToPrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(members[currentIndex - 1]);
    }
  };

  const navigateToNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(members[currentIndex + 1]);
    }
  };

  const updateAdminStatusMutation = useMutation({
    mutationFn: async (isAdmin: boolean) => {
      setIsUpdating(true);
      return await apiRequest(`/api/admin/members/${member.id}/admin-status`, "PATCH", { isAdmin });
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Success",
        description: `Admin status ${updatedUser.isAdmin ? 'granted' : 'removed'} for ${member.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleAdminToggle = async (checked: boolean) => {
    await updateAdminStatusMutation.mutateAsync(checked);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Member Profile</h2>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={navigateToPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={navigateToNext}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center text-center mb-6">
        <Avatar className="h-24 w-24 mb-2">
          <AvatarImage src={member.person?.avatarUrl || ""} alt={member.displayName || "Member"} />
          <AvatarFallback className="text-lg">
            {getInitials(member.displayName)}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-semibold mb-1">{member.displayName || "Unnamed Member"}</h3>
        <p className="text-muted-foreground">{member.email}</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant={member.isVerified ? "default" : "outline"}>
            {member.isVerified ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
            {member.isVerified ? "Verified" : "Pending"}
          </Badge>
          <Badge variant={member.isAdmin ? "default" : "outline"}>
            <UserCog className="h-3 w-3 mr-1" />
            {member.isAdmin ? "Admin" : "Member"}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {format(new Date(member.createdAt), "PPP")}</span>
          </div>
          {member.person && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span>Profile linked to {member.person.fullName || member.person.userName || "event attendee"}</span>
            </div>
          )}
          {member.person?.organizationName && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{member.person.organizationName}</span>
              {member.person.jobTitle && <span className="text-muted-foreground">({member.person.jobTitle})</span>}
            </div>
          )}
        </div>
      </div>

      {member.badges && member.badges.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Tag className="h-4 w-4 mr-2" />
            <h4 className="font-medium">Badges</h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {member.badges.map((badge) => (
              <Badge
                key={badge.id}
                variant="secondary"
                className="flex items-center gap-1 py-1 px-2"
              >
                <span className="text-xs">{badge.icon}</span>
                <span>{badge.name}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-4" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserCog className="h-4 w-4 mr-2" />
            <span>Administrator privileges</span>
          </div>
          <Switch
            checked={member.isAdmin}
            onCheckedChange={handleAdminToggle}
            disabled={isUpdating}
          />
        </div>

        <div className="flex flex-col gap-2">
          {/* Account actions */}
          <p className="text-sm text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Mail className="h-4 w-4" />
              Resend Verification
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" />
              View Full Profile
            </Button>
          </div>
        </div>
      </div>

      {member.bio && (
        <>
          <Separator className="my-4" />
          <div>
            <h4 className="font-medium mb-2">About</h4>
            <p className="text-sm text-muted-foreground">{member.bio}</p>
          </div>
        </>
      )}
    </div>
  );
}