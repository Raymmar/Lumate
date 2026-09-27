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
  Crown,
  CreditCard,
  AlertTriangle,
  Send,
  EyeOff,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ban, ShieldCheck } from "lucide-react";

import type { User, Person, Badge as BadgeType } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getBadgeIcon } from "@/lib/badge-icons";

interface Member extends User {
  blockCleanupPending?: boolean;
  person?: Person | null;
  badges?: BadgeType[];
  emailDriftDetectedAt?: string | null;
  emailDriftPersonEmail?: string | null;
  emailDriftAdminDismissedAt?: string | null;
  blockedAt?: string | null;
  blockedBy?: number | null;
  blockReason?: string | null;
}

interface MemberPreviewProps {
  member: Member;
  members?: Member[];
  onNavigate?: (member: Member) => void;
}

export function MemberPreview({ member, members = [], onNavigate }: MemberPreviewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticMember, setOptimisticMember] = useState<Member>(member);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
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

  const notifyDriftMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/admin/members/${member.id}/notify-drift`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: `Drift notification sent to ${member.email} and ${member.emailDriftPersonEmail}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send drift notification",
        variant: "destructive",
      });
    },
  });

  const dismissDriftMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/admin/members/${member.id}/dismiss-drift`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Dismissed",
        description: "Drift alert dismissed from admin view. The user can still resolve it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss drift",
        variant: "destructive",
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest<{ cleanupComplete: boolean; warnings?: string[] }>(`/api/admin/users/${member.id}/block`, "POST", { reason });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: result.cleanupComplete ? "User Blocked" : "User blocked — cleanup incomplete",
        description: result.cleanupComplete
          ? `${member.email} has been blocked.`
          : `${result.warnings?.join(". ")}. Use Retry block cleanup; the account remains blocked.`,
        variant: result.cleanupComplete ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/admin/users/${member.id}/unblock`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "User Unblocked",
        description: `${member.email} can sign in again. Premium access was not restored.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
        variant: "destructive",
      });
    },
  });

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

      {member.blockedAt && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="h-4 w-4 text-red-500" />
            <h4 className="font-medium text-sm text-red-800 dark:text-red-300">
              Account Blocked
            </h4>
          </div>
          {member.blockReason && (
            <>
              <p className="text-xs text-muted-foreground mb-1">Reason:</p>
              <p className="text-sm font-medium mb-2">{member.blockReason}</p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Blocked {format(new Date(member.blockedAt), "PPP")}
          </p>
        </div>
      )}

      {member.emailDriftDetectedAt && member.emailDriftPersonEmail && (
        <div className={`rounded-lg border p-3 mb-4 ${
          member.emailDriftAdminDismissedAt
            ? "border-border bg-muted/30"
            : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-4 w-4 ${member.emailDriftAdminDismissedAt ? "text-muted-foreground" : "text-amber-500"}`} />
            <h4 className={`font-medium text-sm ${member.emailDriftAdminDismissedAt ? "text-muted-foreground" : "text-amber-800 dark:text-amber-300"}`}>
              {member.emailDriftAdminDismissedAt ? "Email Drift (Dismissed)" : "Email Drift Detected"}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            Luma profile email changed to:
          </p>
          <p className="text-sm font-medium mb-3">
            {member.emailDriftPersonEmail}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Detected {format(new Date(member.emailDriftDetectedAt), "PPP")}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 ${member.emailDriftAdminDismissedAt ? "" : "border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"}`}
              onClick={() => notifyDriftMutation.mutate()}
              disabled={notifyDriftMutation.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {notifyDriftMutation.isPending ? "Sending..." : "Notify"}
            </Button>
            {!member.emailDriftAdminDismissedAt && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => dismissDriftMutation.mutate()}
                disabled={dismissDriftMutation.isPending}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                {dismissDriftMutation.isPending ? "..." : "Dismiss"}
              </Button>
            )}
          </div>
        </div>
      )}

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

      <PremiumMembershipManagement member={member} />

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
            {member.blockedAt ? (
              <>
              {member.blockCleanupPending && (
                <p role="alert" className="w-full text-sm text-destructive">
                  Block cleanup is pending or incomplete. Retry to confirm session deletion and Luma removal.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => blockUserMutation.mutate("")}
                disabled={blockUserMutation.isPending || unblockUserMutation.isPending}
              >
                Retry block cleanup
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
                onClick={() => setShowUnblockDialog(true)}
                disabled={unblockUserMutation.isPending || blockUserMutation.isPending}
              >
                <ShieldCheck className="h-4 w-4" />
                Unblock User
              </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                onClick={() => { setBlockReason(""); setShowBlockDialog(true); }}
                disabled={blockUserMutation.isPending}
              >
                <Ban className="h-4 w-4" />
                Block User
              </Button>
            )}
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

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {member.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately sign the user out, prevent them from logging in,
              stop all emails, remove them from the Luma membership tier, and hide
              them from public surfaces. Their premium access will be suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Why is this user being blocked?"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => blockUserMutation.mutate(blockReason.trim())}
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {member.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              The user will be able to sign in again and reappear on public surfaces.
              Premium access is NOT automatically restored — grant it manually if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unblockUserMutation.mutate()}>
              Unblock User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Premium Membership Management Component
function PremiumMembershipManagement({ member }: { member: Member }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isManualPremium, setIsManualPremium] = useState(false);
  const [premiumExpiresDate, setPremiumExpiresDate] = useState<string>("");

  // Set initial state from member data
  useEffect(() => {
    if (member.premiumSource === 'manual' && member.premiumExpiresAt) {
      setIsManualPremium(true);
      const date = new Date(member.premiumExpiresAt);
      setPremiumExpiresDate(date.toISOString().split('T')[0]);
    } else {
      setIsManualPremium(false);
      // Default to end of current year
      const currentYear = new Date().getFullYear();
      setPremiumExpiresDate(`${currentYear}-12-31`);
    }
  }, [member]);

  const updatePremiumMutation = useMutation({
    mutationFn: async (data: { grantPremium: boolean; expiresAt?: string }) => {
      const response = await apiRequest(`/api/admin/members/${member.id}/premium`, 'PATCH', data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      toast({
        title: "Success",
        description: data.grantPremium 
          ? `Premium access granted to ${member.email}` 
          : `Premium access removed from ${member.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update premium status",
        variant: "destructive",
      });
    },
  });

  const handleToggleManualPremium = () => {
    const newValue = !isManualPremium;
    setIsManualPremium(newValue);

    if (!newValue) {
      // Remove manual premium access
      updatePremiumMutation.mutate({ grantPremium: false });
    }
  };

  const handleSaveManualPremium = () => {
    if (!premiumExpiresDate) {
      toast({
        title: "Error",
        description: "Please select an expiration date",
        variant: "destructive",
      });
      return;
    }

    updatePremiumMutation.mutate({
      grantPremium: true,
      expiresAt: premiumExpiresDate + 'T23:59:59Z',
    });
  };

  // Check for premium access from both Stripe subscriptions and expiring grants (Luma/manual)
  const hasPremiumAccess = 
    member.subscriptionStatus === 'active' || 
    (member.premiumExpiresAt && new Date(member.premiumExpiresAt) > new Date());
  
  const getPremiumSourceLabel = () => {
    // Check Stripe subscription first (highest priority)
    if (member.subscriptionStatus === 'active') {
      return 'Stripe Subscription';
    }
    
    // Then check manual or Luma premium grants
    if (!member.premiumSource) return null;
    
    switch (member.premiumSource) {
      case 'stripe':
        return 'Stripe Subscription';
      case 'luma':
        return 'Luma Ticket';
      case 'manual':
        return 'Admin Grant';
      default:
        return member.premiumSource;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="h-4 w-4" />
        <h4 className="font-medium">Premium Membership</h4>
      </div>

      {/* Current Premium Status */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={hasPremiumAccess ? "default" : "outline"}>
            {hasPremiumAccess ? (
              <>
                <Crown className="h-3 w-3 mr-1" />
                Premium Active
              </>
            ) : (
              "No Premium Access"
            )}
          </Badge>
        </div>

        {hasPremiumAccess && getPremiumSourceLabel() && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Source:</span>
            <span className="text-sm text-muted-foreground">{getPremiumSourceLabel()}</span>
          </div>
        )}

        {member.premiumExpiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Expires:</span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(member.premiumExpiresAt), 'PPP')}
            </span>
          </div>
        )}

        {member.premiumGrantedBy && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Granted By:</span>
            <span className="text-sm text-muted-foreground">{member.premiumGrantedBy}</span>
          </div>
        )}

        {member.lumaTicketId && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Luma Ticket:</span>
            <span className="text-sm text-muted-foreground font-mono">{member.lumaTicketId}</span>
          </div>
        )}
      </div>

      {/* Manual Premium Grant */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">
              Manual Premium Grant
            </label>
            <p className="text-xs text-muted-foreground">
              {member.premiumSource && member.premiumSource !== 'manual' 
                ? "This will override automatic premium sources"
                : "Grant premium access manually"
              }
            </p>
          </div>
          <Switch
            checked={isManualPremium}
            onCheckedChange={handleToggleManualPremium}
            disabled={updatePremiumMutation.isPending}
          />
        </div>

        {isManualPremium && (
          <>
            <div className="space-y-2">
              <label htmlFor="manual-premium-expires" className="text-sm font-medium">
                Expires On
              </label>
              <input
                id="manual-premium-expires"
                type="date"
                value={premiumExpiresDate}
                onChange={(e) => setPremiumExpiresDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              onClick={handleSaveManualPremium}
              disabled={updatePremiumMutation.isPending}
              className="w-full"
              size="sm"
            >
              {updatePremiumMutation.isPending ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2 animate-pulse" />
                  Granting Premium...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Grant Premium Access
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}