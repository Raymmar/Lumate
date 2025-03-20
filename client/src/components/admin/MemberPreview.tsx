import { useToast } from "@/hooks/use-toast";
import type { User, Role, Person, Badge as BadgeType } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RelatedPeople } from "./RelatedPeople";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getBadgeIcon } from "@/lib/badge-icons";

interface MemberPreviewProps {
  member: User & { roles?: Role[]; person?: Person | null; badges?: BadgeType[] };
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

  const [badges, setBadges] = useState<BadgeType[]>(() => {
    console.log("Initializing badges from member:", {
      memberBadges: member.badges,
      memberId: member.id,
      badgeCount: member.badges?.length
    });
    return member.badges || [];
  });

  const [roles, setRoles] = useState<Role[]>(member.roles || []);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(member.isAdmin);

  // Enhanced error handling and logging for badge fetching
  const { data: availableBadges = [], error: badgeError } = useQuery<BadgeType[]>({
    queryKey: ['/api/admin/badges'],
    queryFn: async () => {
      console.log("Fetching available badges...");
      const response = await fetch('/api/admin/badges');
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch badges:", {
          status: response.status,
          error: errorText
        });
        throw new Error(`Failed to fetch badges: ${errorText}`);
      }
      const data = await response.json();
      console.log("Received available badges:", {
        count: data.length,
        badges: data.map((b: BadgeType) => b.name)
      });
      return data;
    }
  });

  const handleAdminToggle = async (checked: boolean) => {
    setIsAdmin(checked);

    try {
      await apiRequest(
        `/api/admin/members/${member.id}/admin-status`,
        "PATCH",
        { isAdmin: checked },
      );

      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });

      toast({
        title: "Success",
        description: `Admin status ${checked ? "granted to" : "revoked from"} ${member.displayName || member.email}`,
      });
    } catch (error) {
      setIsAdmin(!checked);
      console.error("Failed to update admin status:", error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  // Enhanced error handling in badge assignment
  const handleBadgeAssignment = async (badgeName: string) => {
    try {
      console.log("Starting badge assignment:", {
        userId: member.id,
        badgeName,
        currentBadges: badges.map(b => b.name)
      });

      const result = await apiRequest<{ badges: BadgeType[] }>(
        `/api/admin/members/${member.id}/badges/${encodeURIComponent(badgeName)}`,
        "POST",
      );

      if (result.badges) {
        console.log("Badge assignment successful:", {
          userId: member.id,
          badgeName,
          newBadges: result.badges.map(b => b.name)
        });
        setBadges(result.badges);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });

        toast({
          title: "Success",
          description: `Added ${badgeName} badge for ${member.displayName || member.email}`,
        });
      }
    } catch (error) {
      console.error("Failed to update user badges:", error);
      toast({
        title: "Error",
        description: `Failed to assign ${badgeName} badge. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleBadgeRemoval = async (badgeName: string) => {
    try {
      console.log("Starting badge removal:", {
        userId: member.id,
        badgeName,
        currentBadges: badges.map(b => b.name)
      });

      const result = await apiRequest<{ badges: BadgeType[] }>(
        `/api/admin/members/${member.id}/badges/${encodeURIComponent(badgeName)}`,
        "DELETE",
      );

      if (result.badges) {
        console.log("Badge removal successful:", {
          userId: member.id,
          badgeName,
          remainingBadges: result.badges.map(b => b.name)
        });
        setBadges(result.badges);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });

        toast({
          title: "Success",
          description: `Removed ${badgeName} badge from ${member.displayName || member.email}`,
        });
      }
    } catch (error) {
      console.error("Failed to remove user badge:", error);
      toast({
        title: "Error",
        description: `Failed to remove ${badgeName} badge. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleNavigate = (nextMember: typeof member) => {
    if (onNavigate) {
      onNavigate(nextMember);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-16">
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

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Badge variant={member.isVerified ? "default" : "secondary"}>
              {member.isVerified ? "Verified" : "Pending"}
            </Badge>
            {isAdmin && <Badge variant="default">Admin</Badge>}
            {roles.map((role) => (
              <Badge key={role.id} variant="outline">
                {role.name}
              </Badge>
            ))}
            {badges.map((badge) => (
              <div key={badge.id} className="relative group">
                <ProfileBadge
                  name={badge.name}
                  icon={getBadgeIcon(badge.icon)}
                  variant="secondary"
                />
                <button
                  onClick={() => handleBadgeRemoval(badge.name)}
                  className="absolute -top-2 -right-2 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
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
                  checked={isAdmin}
                  onCheckedChange={handleAdminToggle}
                />
                <Label htmlFor="admin-mode">Admin privileges</Label>
              </div>

              <div className="space-y-2">
                <Label>Badges</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {availableBadges.length > 0 ? "Select badges" : "Loading badges..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search badges..." />
                      <CommandEmpty>No badges found.</CommandEmpty>
                      <CommandGroup>
                        {availableBadges.map((badge) => (
                          <CommandItem
                            key={badge.name}
                            onSelect={() => {
                              handleBadgeAssignment(badge.name);
                              setOpen(false);
                            }}
                          >
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  badges.some(b => b.name === badge.name) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                {getBadgeIcon(badge.icon)}
                                <div>
                                  <div>{badge.name}</div>
                                  <div className="text-xs text-muted-foreground">{badge.description}</div>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
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
        </div>
      </div>

      {members.length > 1 && onNavigate && (
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background">
          <div className="flex justify-between items-center p-4">
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