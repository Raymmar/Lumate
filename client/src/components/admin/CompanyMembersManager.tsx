import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronsUpDown, Check, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  userId: number;
  role: string;
  user?: User;
}

interface CompanyMembersManagerProps {
  members: Member[];
  allUsers: User[];
  isLoadingUsers?: boolean;
  canEdit?: boolean;
  canManageRoles?: boolean;
  onAddMember?: (userId: number) => void;
  onRemoveMember?: (userId: number) => void;
  onChangeRole?: (userId: number, role: string) => void;
  className?: string;
}

export function CompanyMembersManager({
  members,
  allUsers,
  isLoadingUsers = false,
  canEdit = false,
  canManageRoles = false,
  onAddMember,
  onRemoveMember,
  onChangeRole,
  className = "",
}: CompanyMembersManagerProps) {
  const [isAddingMember, setIsAddingMember] = useState(false);

  const memberUserIds = members.map(m => m.userId);
  const availableUsers = allUsers.filter(u => !memberUserIds.includes(u.id));

  const handleAddMember = (userId: number) => {
    onAddMember?.(userId);
    setIsAddingMember(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Company Members</h3>
        {canEdit && (
          <Popover open={isAddingMember} onOpenChange={setIsAddingMember}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/40"
                data-testid="button-add-member"
              >
                <ChevronsUpDown className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 z-[99999999]" align="end">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandEmpty>
                  {isLoadingUsers ? "Loading users..." : "No users found."}
                </CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {isLoadingUsers ? (
                      <div className="flex justify-center items-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ScrollArea className="h-72">
                        {availableUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.email}
                            onSelect={() => handleAddMember(user.id)}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            <span>{user.displayName || user.email}</span>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">
          No members added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const user = member.user || allUsers.find(u => u.id === member.userId);
            if (!user) return null;

            const displayName = user.displayName || user.email;
            const isOwner = member.role === 'owner';

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                data-testid={`member-${member.userId}`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {isOwner && (
                      <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {canManageRoles ? (
                  <Select
                    value={member.role}
                    onValueChange={(role) => onChangeRole?.(member.userId, role)}
                  >
                    <SelectTrigger className="w-32" data-testid={`select-role-${member.userId}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[99999999]">
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={isOwner ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                )}

                {canEdit && !isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveMember?.(member.userId)}
                    data-testid={`button-remove-member-${member.userId}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
