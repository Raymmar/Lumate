import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Company, User, Tag } from "@shared/schema";
import { format } from "date-fns";
import { PreviewSidebar } from "./PreviewSidebar";
import { useState } from "react";
import {
  Building2,
  Users,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Link2,
  Tag as TagIcon,
  UserPlus,
  UserMinus,
  Edit,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface CompanyPreviewProps {
  company: Company;
  onClose: () => void;
}

interface CompanyDetails extends Company {
  members: Array<{
    user: User & {
      avatarUrl?: string | null;
      displayName?: string | null;
    };
    role: string;
    title?: string;
  }>;
  tags: Array<{
    id: number;
    text: string;
    createdAt: string;
  }>;
}

// Interface for adding new member
interface AddMemberFormData {
  email: string;
  role: string;
  title?: string;
}

// Interface for editing member role
interface EditMemberRoleData {
  userId: number;
  companyId: number;
  role: string;
}

export function CompanyPreview({ company, onClose }: CompanyPreviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberData, setAddMemberData] = useState<AddMemberFormData>({
    email: "",
    role: "member"
  });
  
  // State for member role editing
  const [editingMember, setEditingMember] = useState<{
    id: number;
    role: string;
  } | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };
  
  // Mutation for adding a member
  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberFormData) => {
      const response = await fetch(`/api/admin/companies/${company.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member added successfully",
        description: "The member has been added to the company.",
      });
      setIsAddMemberOpen(false);
      setAddMemberData({ email: "", role: "member" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for removing a member
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/companies/${company.id}/members/${userId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member removed successfully",
        description: "The member has been removed from the company.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating member role
  const updateMemberRoleMutation = useMutation({
    mutationFn: async (data: EditMemberRoleData) => {
      const response = await fetch(`/api/admin/companies/${data.companyId}/members/${data.userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: data.role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update member role");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member role updated",
        description: "The member's role has been updated successfully.",
      });
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddMember = () => {
    if (!addMemberData.email) {
      toast({
        title: "Email required",
        description: "Please enter an email address for the new member.",
        variant: "destructive",
      });
      return;
    }
    
    addMemberMutation.mutate(addMemberData);
  };
  
  const handleRemoveMember = (userId: number) => {
    removeMemberMutation.mutate(userId);
  };
  
  const handleUpdateMemberRole = (userId: number, role: string) => {
    updateMemberRoleMutation.mutate({
      userId,
      companyId: company.id,
      role,
    });
  };

  const { data, isLoading } = useQuery<CompanyDetails>({
    queryKey: [`/api/admin/companies/${company.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${company.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch company details");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <PreviewSidebar open={open} onOpenChange={handleOpenChange} title="Company Details">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading company details...</p>
          </div>
        </div>
      </PreviewSidebar>
    );
  }

  if (!data) {
    return (
      <PreviewSidebar open={open} onOpenChange={handleOpenChange} title="Company Details">
        <div className="flex items-center justify-center h-full">
          <p>Failed to load company details</p>
        </div>
      </PreviewSidebar>
    );
  }

  return (
    <PreviewSidebar open={open} onOpenChange={handleOpenChange} title={data.name}>
      <div className="space-y-6 p-1">
        {/* Company Header */}
        <div className="flex items-center gap-4">
          {data.logoUrl ? (
            <img
              src={data.logoUrl}
              alt={data.name}
              className="h-16 w-16 rounded-md object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{data.name}</h2>
            <p className="text-sm text-muted-foreground">{data.industry || "No industry specified"}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {data.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {data.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            )}
            
            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${data.email}`} className="text-sm hover:underline">
                  {data.email}
                </a>
              </div>
            )}
            
            {data.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${data.phoneNumber}`} className="text-sm hover:underline">
                  {data.phoneNumber}
                </a>
              </div>
            )}
            
            {data.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{data.address}</span>
              </div>
            )}
            
            {data.size && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{data.size}</span>
              </div>
            )}
            
            {data.founded && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Founded {data.founded}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Description</h3>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag.text}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Company Members */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Company Members</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{data.members.length}</Badge>
              <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Add Member</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to {data.name}</DialogTitle>
                    <DialogDescription>
                      Enter the email address of the user you want to add to this company.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={addMemberData.email}
                        onChange={(e) => setAddMemberData({ ...addMemberData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={addMemberData.role}
                        onValueChange={(value) => setAddMemberData({ ...addMemberData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        placeholder="e.g. CEO, Developer"
                        value={addMemberData.title || ""}
                        onChange={(e) => setAddMemberData({ ...addMemberData, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddMember}
                      disabled={addMemberMutation.isPending}
                    >
                      {addMemberMutation.isPending ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                          Adding...
                        </>
                      ) : "Add Member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {data.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members associated with this company</p>
          ) : (
            <div className="space-y-3">
              {data.members.map((member) => (
                <div key={member.user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.user.avatarUrl || undefined}
                        alt={member.user.displayName || member.user.email}
                      />
                      <AvatarFallback>
                        {(member.user.displayName || member.user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.displayName || member.user.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {member.title || "No title"}
                        </p>
                        {editingMember?.id === member.user.id ? (
                          <Select
                            value={editingMember.role}
                            onValueChange={(value) => setEditingMember({ ...editingMember, role: value })}
                          >
                            <SelectTrigger className="h-6 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingMember?.id === member.user.id ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => handleUpdateMemberRole(member.user.id, editingMember.role)}
                          disabled={updateMemberRoleMutation.isPending}
                        >
                          {updateMemberRoleMutation.isPending ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          ) : <Check className="h-3 w-3" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => setEditingMember(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMember({ id: member.user.id, role: member.role })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive" 
                            onClick={() => handleRemoveMember(member.user.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            {removeMemberMutation.isPending && removeMemberMutation.variables === member.user.id ? (
                              "Removing..."
                            ) : "Remove Member"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Profile Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Profile Information</h3>
          <div className="text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Created</span>
              <span>{format(new Date(data.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground mt-1">
              <span>Last Updated</span>
              <span>{format(new Date(data.updatedAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Edit Company
          </Button>
        </div>
      </div>
    </PreviewSidebar>
  );
}