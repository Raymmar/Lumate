import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
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
  Plus,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import type { User, Person, Badge as BadgeType } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getBadgeIcon } from "@/lib/badge-icons";

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
  const [optimisticMember, setOptimisticMember] = useState<Member>(member);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentIndex = members.findIndex((m) => m.id === member.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < members.length - 1;

  // Fetch available badges
  const { data: availableBadges } = useQuery<BadgeType[]>({
    queryKey: ["/api/admin/badges"],
    enabled: true,
  });

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
    onSuccess: (updatedUser: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Success",
        description: `Admin status ${updatedUser?.isAdmin ? 'granted' : 'removed'} for ${member.email}`,
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

  const assignBadgeMutation = useMutation({
    mutationFn: async (badgeName: string) => {
      setIsUpdating(true);
      return await apiRequest(`/api/admin/members/${member.id}/badges/${badgeName}`, "POST");
    },
    onMutate: async (badgeName: string) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/admin/members"] });
      
      // Find the badge being added
      const badge = availableBadges?.find(b => b.name === badgeName);
      if (!badge) return;
      
      // Create optimistic update
      const updatedMember = { 
        ...optimisticMember,
        badges: [
          ...(optimisticMember.badges || []),
          badge
        ] 
      };
      
      // Apply optimistic update
      setOptimisticMember(updatedMember);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Success",
        description: `Badge assigned to ${member.email}`,
      });
    },
    onError: (error: any, badgeName: string) => {
      // Revert to original state
      setOptimisticMember(member);
      toast({
        title: "Error",
        description: error.message || "Failed to assign badge",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const removeBadgeMutation = useMutation({
    mutationFn: async (badgeName: string) => {
      setIsUpdating(true);
      return await apiRequest(`/api/admin/members/${member.id}/badges/${badgeName}`, "DELETE");
    },
    onMutate: async (badgeName: string) => {
      // Cancel any outgoing queries to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/admin/members"] });
      
      // Create optimistic update by filtering out the removed badge
      const updatedMember = { 
        ...optimisticMember,
        badges: optimisticMember.badges?.filter(badge => badge.name !== badgeName) || []
      };
      
      // Apply optimistic update
      setOptimisticMember(updatedMember);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Success",
        description: `Badge removed from ${member.email}`,
      });
    },
    onError: (error: any, badgeName: string) => {
      // Revert to original state
      setOptimisticMember(member);
      toast({
        title: "Error",
        description: error.message || "Failed to remove badge",
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

  const handleAssignBadge = async (badgeName: string) => {
    if (badgeName) {
      await assignBadgeMutation.mutateAsync(badgeName);
    }
  };

  const handleRemoveBadge = async (badgeName: string) => {
    await removeBadgeMutation.mutateAsync(badgeName);
  };

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      setIsUpdating(true);
      return await apiRequest(`/api/admin/members/${member.id}/resend-verification`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Verification email sent to ${member.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleResendVerification = async () => {
    await resendVerificationMutation.mutateAsync();
  };

  const getViewProfileUrl = () => {
    if (member.person?.userName) {
      return `/people/${member.person.userName}`;
    } else if (member.person?.id) {
      return `/admin/people/${member.person.id}`;
    }
    return null;
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

  // Update optimistic member when the actual member changes
  useEffect(() => {
    setOptimisticMember(member);
  }, [member]);

  // Filter out badges that the user already has
  const filterAvailableBadges = () => {
    if (!availableBadges || !optimisticMember.badges) return availableBadges || [];
    
    const currentBadgeNames = new Set(optimisticMember.badges.map(badge => badge.name));
    return availableBadges.filter(badge => !currentBadgeNames.has(badge.name));
  };

  const filteredBadges = filterAvailableBadges();

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

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            <h4 className="font-medium">Badges</h4>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 block">Available Badges (click to add)</label>
            {filteredBadges?.length === 0 ? (
              <p className="text-sm text-muted-foreground">All badges assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {filteredBadges?.map((badge) => (
                  <Badge
                    key={badge.id}
                    variant="outline"
                    className={`cursor-pointer hover:bg-accent flex items-center gap-1 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => !isUpdating && handleAssignBadge(badge.name)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {getBadgeIcon(badge.icon)}
                    <span className="ml-1">{badge.name}</span>
                  </Badge>
                ))}
              </div>
            )}
            
            <label className="text-sm font-medium mb-2 block">Current Badges (click X to remove)</label>
            {(!optimisticMember.badges || optimisticMember.badges.length === 0) ? (
              <p className="text-sm text-muted-foreground">No badges assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {optimisticMember.badges.map((badge) => (
                  <div key={badge.id} className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 py-1 pl-2 pr-1"
                    >
                      {getBadgeIcon(badge.icon)}
                      <span className="ml-1 mr-1">{badge.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-destructive/10 rounded-full"
                        onClick={() => handleRemoveBadge(badge.name)}
                        disabled={isUpdating}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
          <p className="text-sm text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={handleResendVerification}
              disabled={resendVerificationMutation.isPending || member.isVerified}
            >
              <Mail className="h-4 w-4" />
              Resend Verification
            </Button>
            {getViewProfileUrl() ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                asChild
              >
                <a href={getViewProfileUrl() || '#'} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View Full Profile
                </a>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                disabled
              >
                <ExternalLink className="h-4 w-4" />
                No Profile Found
              </Button>
            )}
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