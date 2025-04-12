import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { Company, InsertCompany } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { CompanyPreview } from "./CompanyPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Globe, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extended Company type that includes member count
interface CompanyWithMemberCount extends Company {
  memberCount: number;
}

interface CompaniesResponse {
  companies: CompanyWithMemberCount[];
  total: number;
}

export function CompaniesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 10;

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return apiRequest('/api/companies', 'POST', data);
    },
    onSuccess: (createdCompany) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setIsCreating(false);
      toast({
        title: 'Company created',
        description: 'The company has been successfully created',
      });
      return createdCompany;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create company: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation for adding members to a company
  const addCompanyMembersMutation = useMutation({
    mutationFn: async ({ companyId, userIds, ownerUserId }: { companyId: number, userIds: number[], ownerUserId: number | null }) => {
      // For each user ID, make a request to add them as a company member
      const promises = userIds.map(userId => 
        apiRequest('/api/companies/members', 'POST', { 
          companyId, 
          userId, 
          // If this user is the owner, set role to 'owner', otherwise 'member'
          role: userId === ownerUserId ? 'owner' : 'member',
          isPublic: true
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/members'] });
    },
    onError: (error) => {
      console.error('Error adding company members:', error);
      toast({
        title: 'Warning',
        description: 'Company was created, but there was an issue adding some members',
        variant: 'destructive',
      });
    }
  });

  // Handle creating a new company
  const handleCreateCompany = async (data: any) => {
    try {
      // Check if there are selected members and owner in the data
      const selectedMembers = data._selectedMembers || [];
      const ownerUserId = data._ownerUserId || null;
      
      // Remove metadata fields before creating company
      delete data._selectedMembers;
      delete data._ownerUserId;

      // Create the company first
      const createdCompany = await createCompanyMutation.mutateAsync(data) as Company;
      
      // If we have selected members and the company was created successfully, add the members
      if (selectedMembers.length > 0 && createdCompany && createdCompany.id) {
        await addCompanyMembersMutation.mutateAsync({
          companyId: createdCompany.id,
          userIds: selectedMembers,
          ownerUserId: ownerUserId
        });
      }
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  const { data, isLoading, error } = useQuery<CompaniesResponse>({
    queryKey: ["/api/admin/companies", debouncedSearch, page],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/companies?search=${encodeURIComponent(
          debouncedSearch
        )}&page=${page}&limit=${ITEMS_PER_PAGE}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      return response.json();
    },
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-2">
          {row.logoUrl ? (
            <img
              src={row.logoUrl}
              alt={row.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
          {row.name}
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      cell: (row: CompanyWithMemberCount) => (
        <div>
          {row.industry ? (
            <Badge variant="outline">{row.industry}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-1 text-sm">
          {row.website ? (
            <>
              <Globe className="h-3 w-3 text-muted-foreground" />
              <a
                href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[150px]"
              >
                {row.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "memberCount",
      header: "Members",
      cell: (row: CompanyWithMemberCount) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span>{row.memberCount}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: CompanyWithMemberCount) => format(new Date(row.createdAt), "MMM d, yyyy"),
    },
  ];

  const actions = [
    {
      label: "View Details",
      onClick: (company: CompanyWithMemberCount) => {
        setSelectedCompany(company);
      },
    },
  ];

  if (error) {
    return <div>Error loading companies: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold tracking-tight">Companies</h2>
          <div className="flex items-center ml-4">
            <Badge variant="outline">{data?.total || 0}</Badge>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search companies..."
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedCompany(null);
              setIsCreating(true);
            }}
            disabled={createCompanyMutation.isPending}
          >
            {createCompanyMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Company
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            data={data?.companies || []}
            columns={columns}
            actions={actions}
            onRowClick={(company) => setSelectedCompany(company)}
          />

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) handlePageChange(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem className="flex items-center text-sm">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) handlePageChange(page + 1);
                    }}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {selectedCompany && (
        <CompanyPreview
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          companies={data?.companies || []}
          onNavigate={(company) => setSelectedCompany(company)}
        />
      )}

      {isCreating && (
        <CompanyPreview
          isNew={true}
          onClose={() => setIsCreating(false)}
          onSave={handleCreateCompany}
          isEditing={true}
        />
      )}
    </div>
  );
}