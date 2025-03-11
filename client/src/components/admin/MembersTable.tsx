import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { User, Person, Badge } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { MemberPreview } from "./MemberPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";

interface Member extends User {
  person?: Person | null;
  badges?: Badge[];
}

interface MembersResponse {
  users: Member[];
  total: number;
}

export function MembersTable() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  const itemsPerPage = 100;

  const { data, isLoading, isFetching, error } = useQuery<MembersResponse>({
    queryKey: ["/api/admin/members", currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      try {
        console.log('Fetching members with params:', {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch
        });

        const response = await fetch(
          `/api/admin/members?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`Failed to fetch members: ${errorText}`);
        }

        const data = await response.json();
        console.log('Received members data:', {
          totalUsers: data.total,
          returnedUsers: data.users?.length,
          firstUserEmail: data.users?.[0]?.email
        });
        return data;
      } catch (err) {
        console.error('Error fetching members:', err);
        toast({
          title: "Error",
          description: "Failed to load members. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    retry: 1,
  });

  const users = data?.users || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columns = [
    {
      key: "email",
      header: "Email",
      cell: (row: Member) => row.email,
    },
    {
      key: "displayName",
      header: "Display Name",
      cell: (row: Member) => row.displayName || "—",
    },
    {
      key: "isVerified",
      header: "Status",
      cell: (row: Member) => (row.isVerified ? "Verified" : "Pending"),
    },
    {
      key: "badges",
      header: "Badges",
      cell: (row: Member) => row.badges?.length || 0,
    },
    {
      key: "createdAt",
      header: "Joined",
      cell: (row: Member) => format(new Date(row.createdAt), "PPP"),
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (member: Member) => {
        setSelectedMember(member);
      },
    },
  ];

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">Failed to load members</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search members..."
          isLoading={isFetching}
        />
      </div>

      <div className="min-h-[400px] relative mt-4">
        <div 
          className={`transition-opacity duration-300 ${
            isFetching ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <DataTable
            data={users}
            columns={columns}
            actions={actions}
            onRowClick={(member) => setSelectedMember(member)}
          />
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4">
                  Page {currentPage} of {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && setCurrentPage(prev => prev + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <PreviewSidebar open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        {selectedMember && (
          <MemberPreview 
            member={selectedMember} 
            members={users}
            onNavigate={(member) => setSelectedMember(member)}
          />
        )}
      </PreviewSidebar>
    </div>
  );
}