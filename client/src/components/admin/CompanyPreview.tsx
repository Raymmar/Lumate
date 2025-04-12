import { Company, InsertCompany, User } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2 } from "lucide-react";
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
import { CompanyMembersList } from "./CompanyMembersList";

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
  
  // Check if user can edit this company
  const canEditCompany = user?.isAdmin;
  
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
      
      return apiRequest<Company>(`/api/companies/${company.id}`, 'PUT', data);
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

  // Handle company saving, either create or update
  const handleCompanySave = async (data: InsertCompany) => {
    try {
      if (isNew && onSave) {
        await onSave(data);
      } else if (company?.id) {
        await updateCompanyMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Error saving company:', error);
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
    >
      {error ? (
        <div className="p-4 text-center">
          <div className="text-destructive mb-2">Error</div>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : isEditMode || isNew ? (
        <div className="p-4">
          <CompanyForm
            company={company}
            onSubmit={handleCompanySave}
            isLoading={updateCompanyMutation.isPending}
          />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Navigation Controls */}
          {!isNew && !readOnly && (
            <div className="flex items-center justify-between p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasPrevious}
                onClick={() => 
                  hasPrevious && 
                  handleNavigate(availableCompanies[currentIndex - 1])
                }
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
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Company Content */}
          <div className="flex-1 overflow-y-auto">
            {company ? (
              <div className="space-y-6 p-4">
                {/* Company Header */}
                <div className="relative">
                  {company.featuredImageUrl && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4 relative group">
                      <img 
                        src={company.featuredImageUrl} 
                        alt={company.name} 
                        className="w-full h-full object-cover" 
                      />
                      
                      {/* Top Right Action Menu */}
                      {canEditCompany && (
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-sm"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setShowDeleteDialog(true)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    {company.logoUrl ? (
                      <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={company.logoUrl} 
                          alt={`${company.name} logo`} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        No logo
                      </div>
                    )}
                    
                    <div>
                      <h1 className="text-2xl font-bold">{company.name}</h1>
                      <div className="text-muted-foreground">
                        {company.industry && (
                          <span className="inline-block">{company.industry}</span>
                        )}
                        {company.size && company.industry && (
                          <span className="mx-1.5">•</span>
                        )}
                        {company.size && (
                          <span className="inline-block">{company.size} employees</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div>
                  {company.description && (
                    <p className="text-lg mb-4">{company.description}</p>
                  )}
                  
                  {company.bio && (
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold mb-2">About</h2>
                      <p>{company.bio}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {company.website && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                        <div className="flex items-center gap-1">
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center"
                          >
                            {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                            <ExternalLink className="h-3.5 w-3.5 ml-1" />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {company.email && company.isEmailPublic && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                        <a 
                          href={`mailto:${company.email}`}
                          className="text-primary hover:underline"
                        >
                          {company.email}
                        </a>
                      </div>
                    )}
                    
                    {company.phoneNumber && company.isPhonePublic && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                        <a 
                          href={`tel:${company.phoneNumber}`}
                          className="text-primary hover:underline"
                        >
                          {company.phoneNumber}
                        </a>
                      </div>
                    )}
                    
                    {company.address && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                        <p>{company.address}</p>
                      </div>
                    )}
                    
                    {company.founded && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Founded</h3>
                        <p>{company.founded}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Company Tags */}
                  {company.tags && company.tags.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {company.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Company Links */}
                  {company.customLinks && (
                    ((typeof company.customLinks === 'string' && 
                      company.customLinks.length > 0 && 
                      JSON.parse(company.customLinks).length > 0) || 
                     (Array.isArray(company.customLinks) && company.customLinks.length > 0))
                  ) && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Links</h3>
                      <div className="space-y-2">
                        {(typeof company.customLinks === 'string' 
                          ? JSON.parse(company.customLinks) 
                          : company.customLinks
                        ).map((link: { title: string, url: string }, index: number) => (
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
                  )}
                </div>

                {/* Company Members */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Company Members</h2>
                  {isLoadingMembers ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : members.length > 0 ? (
                    <CompanyMembersList 
                      members={members} 
                      companyId={company.id} 
                      onMembersChanged={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/companies/members', company.id] });
                      }}
                    />
                  ) : (
                    <div className="p-4 border rounded-md text-center text-muted-foreground">
                      No members associated with this company
                    </div>
                  )}
                  
                  {/* Add Member Button (Only for admins) */}
                  {canEditCompany && (
                    <div className="mt-4">
                      <RouterLink to={`/admin/companies/${company.id}/members`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Manage Company Members
                        </Button>
                      </RouterLink>
                    </div>
                  )}
                </div>

                {/* Admin Action Buttons */}
                {canEditCompany && (
                  <div className="border-t pt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Company
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}

                {/* View Public Profile Button */}
                <div className="mt-4">
                  <RouterLink to={`/companies/${company.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Public Profile
                    </Button>
                  </RouterLink>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-muted-foreground">Company not found</p>
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