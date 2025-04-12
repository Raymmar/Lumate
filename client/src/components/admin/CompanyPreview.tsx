import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Company, User, Tag, InsertCompany } from "@shared/schema";
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
  Calendar,
  Tag as TagIcon,
  Edit,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { CompanyForm } from "./CompanyForm";

interface CompanyPreviewProps {
  company?: Company;
  onClose: () => void;
  isNew?: boolean;
  isEditing?: boolean;
  onSave?: (data: any) => Promise<void>;
  readOnly?: boolean;
}

// Custom tags interface for the detailed company view
interface CompanyTag {
  id: number;
  text: string;
  createdAt: string;
}

interface CompanyDetails extends Omit<Company, 'tags'> {
  members: Array<{
    user: User & {
      avatarUrl?: string | null;
      displayName?: string | null;
    };
    role: string;
    title?: string;
  }>;
  tags: Array<CompanyTag>;
}

interface AddMemberFormData {
  userId: string;
  role: string;
}

export function CompanyPreview({ 
  company, 
  onClose, 
  isNew = false, 
  isEditing = false, 
  onSave,
  readOnly = false
}: CompanyPreviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [memberRole, setMemberRole] = useState<string>("user");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isEditing);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  // Create or edit company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      if (company) {
        // Update existing company
        return apiRequest(`/api/companies/${company.id}`, "PUT", data);
      } else {
        // Create new company
        return apiRequest("/api/companies", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      if (company) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
      }
      toast({
        title: "Success",
        description: company ? "Company updated successfully" : "Company created successfully",
      });
      setIsEditMode(false);
    },
    onError: (error) => {
      console.error("Failed to save company:", error);
      toast({
        title: "Error",
        description: `Failed to ${company ? "update" : "create"} company`,
        variant: "destructive",
      });
    }
  });

  // If we're creating a new company, don't need to fetch anything
  const shouldFetchCompany = !isNew && !isEditMode && company?.id !== undefined;

  // Fetch company details if viewing an existing company
  const { data, isLoading } = useQuery<CompanyDetails>({
    queryKey: [`/api/admin/companies/${company?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/${company?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch company details");
      }
      return response.json();
    },
    enabled: shouldFetchCompany,
  });
  
  // Get the list of users for adding members or creating a company
  const { data: users = [] } = useQuery<Array<User>>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: isAddMemberOpen || isNew || isEditMode,
  });
  
  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberFormData) => {
      if (!company?.id) return null;
      return apiRequest(`/api/companies/${company.id}/members`, "POST", {
        userId: parseInt(data.userId),
        role: data.role,
        isPublic: true
      });
    },
    onSuccess: () => {
      if (company?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
      }
      setIsAddMemberOpen(false);
      setSelectedUserId("");
      setMemberRole("user");
      toast({
        title: "Success",
        description: "Member added to company",
      });
    },
    onError: (error) => {
      console.error("Failed to add member:", error);
      toast({
        title: "Error",
        description: "Failed to add member to company",
        variant: "destructive",
      });
    }
  });
  
  // Toggle member admin status mutation
  const toggleMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, isAdmin }: { memberId: number, isAdmin: boolean }) => {
      if (!company?.id) return null;
      return apiRequest(`/api/companies/${company.id}/members/${memberId}`, "PUT", {
        role: isAdmin ? "admin" : "user"
      });
    },
    onSuccess: () => {
      if (company?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
      }
      toast({
        title: "Success",
        description: "Member role updated",
      });
    },
    onError: (error) => {
      console.error("Failed to update member role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    }
  });
  
  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      if (!company?.id) return null;
      return apiRequest(`/api/companies/${company.id}/members/${memberId}`, "DELETE");
    },
    onSuccess: () => {
      if (company?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/companies/${company.id}`] });
      }
      toast({
        title: "Success",
        description: "Member removed from company",
      });
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member from company",
        variant: "destructive",
      });
    }
  });
  
  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingMember(true);
    try {
      await addMemberMutation.mutateAsync({
        userId: selectedUserId,
        role: memberRole
      });
    } finally {
      setIsAddingMember(false);
    }
  };
  
  const handleUpdateCompany = async (formData: any) => {
    try {
      if (isNew || isEditMode) {
        // For new company or edit mode, use the update mutation
        await updateCompanyMutation.mutateAsync(formData);
        // If this is a new company and we have an onSave handler, call it
        if (isNew && onSave) {
          await onSave(formData);
        }
      }
    } catch (error) {
      console.error("Error creating/updating company:", error);
    }
  };

  // If we're creating a new company or editing, show the form
  if (isNew || isEditMode) {
    return (
      <PreviewSidebar 
        open={open} 
        onOpenChange={handleOpenChange} 
        title={isNew ? "Create New Company" : `Edit ${company?.name || "Company"}`}
      >
        <CompanyForm
          defaultValues={company || undefined}
          onSubmit={handleUpdateCompany}
          isEditing={!isNew}
        />
      </PreviewSidebar>
    );
  }
  
  // Show loading state when fetching company details
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

  // Show error state if company details failed to load
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
                <span className="text-sm">
                  {(() => {
                    try {
                      // Check if the address is a JSON string
                      if (typeof data.address === 'string' && data.address.startsWith('{')) {
                        const addressObj = JSON.parse(data.address);
                        return addressObj.formatted_address || addressObj.address || data.address;
                      }
                      return data.address;
                    } catch (error) {
                      return data.address;
                    }
                  })()}
                </span>
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
                  <Button variant="outline" size="sm" className="h-7 px-2">
                    <UserPlus className="h-4 w-4 mr-1" />
                    <span className="text-xs">Add Member</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to {data.name}</DialogTitle>
                    <DialogDescription>
                      Select a user to add as a member of this company.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-select">Select User</Label>
                      <Select 
                        value={selectedUserId || ""} 
                        onValueChange={setSelectedUserId}
                      >
                        <SelectTrigger id="user-select">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.displayName || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    

                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="role">Company Admin</Label>
                        <Switch
                          id="role"
                          checked={memberRole === "admin"}
                          onCheckedChange={(checked) => 
                            setMemberRole(checked ? "admin" : "user")
                          }
                          className="h-[18px] w-[34px]"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Company admins can manage company details and members
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddMemberOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddMember}
                      disabled={isAddingMember || !selectedUserId}
                    >
                      {isAddingMember && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      Add Member
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
                <div key={member.user.id} className="flex items-center justify-between gap-3">
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
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center mr-2">
                      <Switch
                        checked={member.role === "admin"}
                        onCheckedChange={(checked) => 
                          toggleMemberRoleMutation.mutate({ 
                            memberId: member.user.id, 
                            isAdmin: checked 
                          })
                        }
                        disabled={toggleMemberRoleMutation.isPending}
                        className="h-[18px] w-[34px]"
                      />
                      <span className="text-xs ml-1">Admin</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm(`Remove ${member.user.displayName || member.user.email} from ${data.name}?`)) {
                          removeMemberMutation.mutate(member.user.id);
                        }
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
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
          <Button onClick={() => setIsEditMode(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Company
          </Button>
        </div>
      </div>
    </PreviewSidebar>
  );
}