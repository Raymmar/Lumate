import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { User, Person } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { MemberPreview } from "./MemberPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MembersResponse {
  users: (User & { person?: Person | null })[];
  total: number;
}

export function MembersTable() {
  const [selectedMember, setSelectedMember] = useState<User & { person?: Person | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500); // Add 500ms debounce
  const itemsPerPage = 100;

  const { data, isLoading, isFetching } = useQuery<MembersResponse>({
    queryKey: ["/api/admin/members", currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/members?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    keepPreviousData: true,
  });

  const users = data?.users || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columns = [
    {
      key: "email",
      header: "Email",
      cell: (row: User) => row.email,
    },
    {
      key: "displayName",
      header: "Display Name",
      cell: (row: User) => row.displayName || "—",
    },
    {
      key: "isVerified",
      header: "Status",
      cell: (row: User) => (row.isVerified ? "Verified" : "Pending"),
    },
    {
      key: "createdAt",
      header: "Joined",
      cell: (row: User) => format(new Date(row.createdAt), "PPP"),
    },
  ];

  const actions = [
    {
      label: "View Profile",
      onClick: (member: User & { person?: Person | null }) => {
        setSelectedMember(member);
      },
    },
    {
      label: "Edit",
      onClick: (member: User) => {
        console.log("Edit member:", member);
      },
    },
  ];

  const onRowClick = (member: User & { person?: Person | null }) => {
    setSelectedMember(member);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search members..."
          isLoading={isFetching}
        />
      </div>

      <div className={`min-h-[400px] transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
        <DataTable
          data={users}
          columns={columns}
          actions={actions}
          onRowClick={onRowClick}
          isLoading={isLoading}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
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
                onClick={handleNextPage}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <PreviewSidebar open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        {selectedMember && <MemberPreview member={selectedMember} />}
      </PreviewSidebar>
    </div>
  );
}