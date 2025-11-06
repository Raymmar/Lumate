import { Company, InsertCompany, User } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, UserPlus, Check, Eye, X } from "lucide-react";
import { CompanyForm } from "./CompanyForm";
import { useEffect, useState } from 'react';
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link as RouterLink } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CompanyMembersManager } from "./CompanyMembersManager";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

interface CompanyPreviewProps {
  company?: Company;
  isNew?: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onSave?: (data: InsertCompany) => Promise<void>;
  readOnly?: boolean;
  companies?: Company[];
  onNavigate?: (company: Company) => void;
}

export function CompanyPreview({
  company,
  isNew = false,
  isEditing = false,
  onClose,
  onSave,
  readOnly = false,
  companies = [],
  onNavigate
}: CompanyPreviewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [formRef, setFormRef] = useState<{ submit: () => void } | null>(null);
  
  // Check if user can edit this company
  const canEditCompany = user?.isAdmin;
  
  // Fetch complete company data for detailed view
  const { data: companyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/admin/companies', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const response = await fetch(`/api/admin/companies/${company.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company details');
      }
      return response.json();
    },
    enabled: !!company?.id && !isNew && !isEditMode
  });
  
  // Fetch company members if we have a company ID
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/companies/members', company?.id],
    queryFn: async () => {
      if (!company?.id) return { members: [] };
      const response = await fetch(`/api/companies/${company.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch company members');
      }
      return response.json();
    },
    enabled: !!company?.id
  });

  // Fetch all users for member management
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<{ users: User[], total: number }>({
    queryKey: ["/api/admin/members"],
    queryFn: async () => {
      const response = await fetch("/api/admin/members?limit=10000"); // Get ALL users for search
      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }
      return response.json();
    }
  });
  
  useEffect(() => {
    if (membersData?.members) {
      setMembers(membersData.members);
    }
  }, [membersData]);

  // Filter out the available companies for navigation
  const availableCompanies = companies;
  const currentIndex = availableCompanies.findIndex(c => c.id === company?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < availableCompanies.length - 1;

  // Handle navigation
  const handleNavigate = async (nextCompany: Company) => {
    if (onNavigate) {
      onNavigate(nextCompany);
    }
  };

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) return;
      
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      toast({
        title: 'Company deleted',
        description: 'The company has been successfully deleted.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      if (!company?.id) return;
      
      // Import formatCompanyNameForUrl from utils
      const { formatCompanyNameForUrl } = await import('@/lib/utils');
      
      // Create a copy of the data to modify
      const updatedData = { ...data };
      
      // Generate a URL-friendly slug from company name if name is being updated
      if (updatedData.name) {
        // Use company ID as fallback if slug generation fails
        const slug = formatCompanyNameForUrl(updatedData.name, String(company.id));
        
        // Add the slug to the data being updated
        updatedData.slug = slug;
        console.log(`Generated slug "${slug}" for company "${updatedData.name}"`);
      }
      
      return apiRequest<Company>(`/api/companies/${company.id}`, 'PUT', updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setIsEditMode(false);
      toast({
        title: 'Company updated',
        description: 'The company has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation for adding members to a company
  const addCompanyMembersMutation = useMutation({
    mutationFn: async ({ companyId, userIds, ownerUserId }: { 
      companyId: number, 
      userIds: number[], 
      ownerUserId: number | null 
    }) => {
      try {
        console.log("Processing company members:", { companyId, userIds, ownerUserId });
        
        // First, get the existing members to avoid adding duplicates
        const existingMembersResponse = await fetch(`/api/companies/${companyId}/members`);
        if (!existingMembersResponse.ok) {
          throw new Error('Failed to fetch company members');
        }
        const existingMembersData = await existingMembersResponse.json();
        console.log("Existing members data:", existingMembersData);
        
        const existingMemberIds = existingMembersData.members.map((member: any) => member.userId);
        
        // Filter out any user IDs that are already members
        const newMemberIds = userIds.filter(id => !existingMemberIds.includes(id));
        console.log("New member IDs to add:", newMemberIds);
        
        // Find existing owner to update role if needed
        const existingOwner = existingMembersData.members.find((member: any) => member.role === 'owner');
        
        // Update roles if ownership is changing
        let updatePromises: Promise<any>[] = [];
        
        // If we have a new owner and it's different from the current owner
        if (ownerUserId && existingOwner && existingOwner.userId !== ownerUserId) {
          console.log(`Demoting existing owner (${existingOwner.userId}) to member`);
          // Demote the existing owner to member
          updatePromises.push(
            apiRequest(`/api/companies/${companyId}/members/${existingOwner.userId}`, 'PUT', { 
              role: 'member' 
            })
          );
          
          // If the new owner is already a member, promote them to owner
          if (existingMemberIds.includes(ownerUserId)) {
            console.log(`Promoting user ${ownerUserId} to owner`);
            updatePromises.push(
              apiRequest(`/api/companies/${companyId}/members/${ownerUserId}`, 'PUT', { 
                role: 'owner' 
              })
            );
            // Remove new owner from the list of members to add since they're already a member
            const index = newMemberIds.indexOf(ownerUserId);
            if (index > -1) {
              newMemberIds.splice(index, 1);
            }
          }
        }
        
        // Now add any new members
        const addPromises = newMemberIds.map(userId => {
          console.log(`Adding member ${userId} to company ${companyId}`);
          return apiRequest(`/api/companies/${companyId}/members`, 'POST', { 
            userId, 
            // If this user is the owner and not already a member, set role to 'owner'
            role: userId === ownerUserId ? 'owner' : 'member',
            isPublic: true
          });
        });
        
        // Execute all promises
        await Promise.all([...updatePromises, ...addPromises]);
        
        return { success: true };
      } catch (error) {
        console.error('Error processing company members:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/members', company?.id] });
    },
    onError: (error) => {
      console.error('Error adding company members:', error);
      toast({
        title: 'Warning',
        description: 'Company was updated, but there was an issue managing the company members',
        variant: 'destructive',
      });
    }
  });

  // Handle company saving, either create or update
  const handleCompanySave = async (data: any) => {
    try {
      console.log("Company save data:", data);
      
      // Extract selected members, owner, and tags if present
      const { _selectedMembers, _ownerUserId, tags, ...companyData } = data;
      const selectedMembers = _selectedMembers || [];
      const ownerUserId = _ownerUserId || null;

      if (isNew && onSave) {
        // For new companies, pass the data to the parent component (CompaniesTable)
        // which will handle creating the company and assigning members
        await onSave({
          ...companyData,
          tags: tags || [], // Ensure tags are included
          _selectedMembers: selectedMembers,
          _ownerUserId: ownerUserId
        });
      } else if (company?.id) {
        // For existing companies, update the company data
        // Make sure tags are included in the update
        const dataToUpdate = {
          ...companyData,
          tags: tags || [] // Ensure tags are properly passed to the API
        };
        
        console.log("Updating company with data:", dataToUpdate);
        await updateCompanyMutation.mutateAsync(dataToUpdate);
        
        // If members were selected, handle them after updating the company
        if (selectedMembers.length > 0) {
          console.log("Processing selected members:", selectedMembers);
          // Add the selected members to the company
          await addCompanyMembersMutation.mutateAsync({
            companyId: company.id,
            userIds: selectedMembers,
            ownerUserId: ownerUserId
          });
        }
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: 'Error',
        description: `Failed to save company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  // Handle company deletion
  const handleDeleteCompany = async () => {
    if (!company?.id) return;
    
    try {
      await deleteCompanyMutation.mutateAsync();
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  return (
    <PreviewSidebar
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isNew ? "Create Company" : company?.name || "Company Details"}
      headerActions={
        isEditMode || isNew ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditMode(false)}
              disabled={updateCompanyMutation.isPending}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => formRef?.submit()}
              disabled={updateCompanyMutation.isPending}
              data-testid="button-save-company"
            >
              <Check className="h-4 w-4 mr-2" />
              {updateCompanyMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        ) : !isNew && canEditCompany && company ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditMode(true)}
              data-testid="button-edit-company"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Company</span>
            </Button>
            {(companyDetails?.slug || company?.slug) && (
              <RouterLink to={`/companies/${companyDetails?.slug || company?.slug}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="button-view-profile"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View Public Profile</span>
                </Button>
              </RouterLink>
            )}
          </>
        ) : null
      }
      navigation={
        !isNew && !readOnly && !isEditMode ? (
          <div className="flex items-center justify-between px-6 py-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasPrevious}
              onClick={() => 
                hasPrevious && 
                handleNavigate(availableCompanies[currentIndex - 1])
              }
              data-testid="button-previous-company"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasNext}
              onClick={() => 
                hasNext && 
                handleNavigate(availableCompanies[currentIndex + 1])
              }
              data-testid="button-next-company"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : null
      }
    >
      {error ? (
        <div className="p-6 text-center">
          <div className="text-destructive mb-2">Error</div>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : isEditMode || isNew ? (
        <div className="p-6">
          <CompanyForm
            company={companyDetails || company}
            onSubmit={handleCompanySave}
            isLoading={updateCompanyMutation.isPending}
            onCancel={() => setIsEditMode(false)}
            hideButtons={true}
            onFormReady={setFormRef}
          />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Company Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingDetails ? (
              <div className="p-6 space-y-4">
                <div className="w-full aspect-video bg-muted rounded-lg animate-pulse"></div>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-20 bg-muted rounded animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                  <div className="h-10 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {/* Company Header */}
                <div className="relative">
                  {/* Use companyDetails if available, otherwise fall back to company prop */}
                  {(companyDetails?.featuredImageUrl || company?.featuredImageUrl) && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4 relative group">
                      <img 
                        src={companyDetails?.featuredImageUrl || company?.featuredImageUrl} 
                        alt={(companyDetails?.name || company?.name) || "Company"} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    {(companyDetails?.logoUrl || company?.logoUrl) ? (
                      <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={companyDetails?.logoUrl || company?.logoUrl} 
                          alt={`${companyDetails?.name || company?.name} logo`} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        No logo
                      </div>
                    )}
                    
                    <div>
                      <h1 className="text-2xl font-bold">{companyDetails?.name || company?.name}</h1>
                      <div className="text-muted-foreground">
                        {(companyDetails?.industry || company?.industry) && (
                          <span className="inline-block">{companyDetails?.industry || company?.industry}</span>
                        )}
                        {(companyDetails?.size || company?.size) && (companyDetails?.industry || company?.industry) && (
                          <span className="mx-1.5">•</span>
                        )}
                        {(companyDetails?.size || company?.size) && (
                          <span className="inline-block">{companyDetails?.size || company?.size} employees</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div>
                  {(companyDetails?.description || company?.description) && (
                    <div className="mb-4">
                      <TruncatedText 
                        text={companyDetails?.description || company?.description || ""} 
                        className="text-lg"
                      />
                    </div>
                  )}
                  
                  {(companyDetails?.bio || company?.bio) && (
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold mb-2">About</h2>
                      <TruncatedText text={companyDetails?.bio || company?.bio || ""} />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {(companyDetails?.website || company?.website) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                        <div className="flex items-center gap-1">
                          <a 
                            href={companyDetails?.website || company?.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center"
                          >
                            {(companyDetails?.website || company?.website)?.replace(/^https?:\/\/(www\.)?/, '')}
                            <ExternalLink className="h-3.5 w-3.5 ml-1" />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {((companyDetails?.email || company?.email) && 
                      (companyDetails?.isEmailPublic || company?.isEmailPublic)) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                        <a 
                          href={`mailto:${companyDetails?.email || company?.email}`}
                          className="text-primary hover:underline"
                        >
                          {companyDetails?.email || company?.email}
                        </a>
                      </div>
                    )}
                    
                    {((companyDetails?.phoneNumber || company?.phoneNumber) && 
                      (companyDetails?.isPhonePublic || company?.isPhonePublic)) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                        <a 
                          href={`tel:${companyDetails?.phoneNumber || company?.phoneNumber}`}
                          className="text-primary hover:underline"
                        >
                          {companyDetails?.phoneNumber || company?.phoneNumber}
                        </a>
                      </div>
                    )}
                    
                    {(companyDetails?.address || company?.address) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                        <p>{companyDetails?.address || company?.address}</p>
                      </div>
                    )}
                    
                    {(companyDetails?.founded || company?.founded) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Founded</h3>
                        <p>{companyDetails?.founded || company?.founded}</p>
                      </div>
                    )}
                    
                    {/* Display Slug field if available */}
                    {((companyDetails as any)?.slug || (company as any)?.slug) && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Slug</h3>
                        <p>{(companyDetails as any)?.slug || (company as any)?.slug}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Company Tags */}
                  {((companyDetails?.tags || company?.tags) && 
                    Array.isArray(companyDetails?.tags || company?.tags) && 
                    (companyDetails?.tags || company?.tags)?.length > 0) && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {(companyDetails?.tags || company?.tags)?.map((tag: any, index: number) => (
                          <Badge key={index} variant="secondary">
                            {typeof tag === 'string' ? tag : tag.text || ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Company Links */}
                  {(() => {
                    // Use an IIFE (Immediately Invoked Function Expression) to safely handle custom links
                    let displayLinks: Array<{ title: string, url: string }> = [];
                    
                    // Get customLinks from either companyDetails or company
                    const customLinks = companyDetails?.customLinks || company?.customLinks;
                    
                    // Safely parse customLinks
                    if (customLinks) {
                      if (typeof customLinks === 'string') {
                        try {
                          const parsed = JSON.parse(customLinks);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            displayLinks = parsed;
                          }
                        } catch (e) {
                          console.error('Error parsing customLinks:', e);
                        }
                      } else if (Array.isArray(customLinks) && customLinks.length > 0) {
                        displayLinks = customLinks;
                      }
                    }
                    
                    // Only render the links section if we have valid links
                    return displayLinks.length > 0 ? (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Links</h3>
                        <div className="space-y-2">
                          {displayLinks.map((link, index) => (
                            <div key={index}>
                              <a 
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center"
                              >
                                {link.title}
                                <ExternalLink className="h-3.5 w-3.5 ml-1" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Company Members - Unified Component */}
                {isLoadingMembers ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Company Members</h2>
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ) : (
                  <CompanyMembersManager
                    members={members}
                    allUsers={usersData?.users || []}
                    isLoadingUsers={isLoadingUsers}
                    canEdit={canEditCompany}
                    canManageRoles={user?.isAdmin || false}
                    onAddMember={async (userId) => {
                      if (!company?.id) return;
                      try {
                        await apiRequest(
                          `/api/companies/${company.id}/members`,
                          'POST',
                          { userId, role: 'user' }
                        );
                        queryClient.invalidateQueries({ queryKey: ['/api/companies/members', company.id] });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Failed to add member",
                          description: error instanceof Error ? error.message : "Unknown error"
                        });
                      }
                    }}
                    onRemoveMember={async (userId) => {
                      if (!company?.id) return;
                      try {
                        await apiRequest(
                          `/api/companies/${company.id}/members/${userId}`,
                          'DELETE'
                        );
                        queryClient.invalidateQueries({ queryKey: ['/api/companies/members', company.id] });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Failed to remove member",
                          description: error instanceof Error ? error.message : "Unknown error"
                        });
                      }
                    }}
                    onChangeRole={async (userId, role) => {
                      if (!company?.id) return;
                      try {
                        await apiRequest(
                          `/api/companies/${company.id}/members/${userId}`,
                          'PUT',
                          { role }
                        );
                        queryClient.invalidateQueries({ queryKey: ['/api/companies/members', company.id] });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Failed to update role",
                          description: error instanceof Error ? error.message : "Unknown error"
                        });
                      }
                    }}
                  />
                )}

                {/* Created Date */}
                {!isNew && (companyDetails?.createdAt || company?.createdAt) && (
                  <div className="pt-6 mt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Created:</span> {format(new Date(companyDetails?.createdAt || company?.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                )}

                {/* Delete Button - Separated at bottom */}
                {canEditCompany && !isNew && (
                  <div className={`${(companyDetails?.createdAt || company?.createdAt) ? 'pt-4 mt-4' : 'pt-6 mt-6 border-t'}`}>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="w-full"
                      data-testid="button-delete-company"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Company
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the company "{company?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PreviewSidebar>
  );
}