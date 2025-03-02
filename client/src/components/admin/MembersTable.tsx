import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { MemberPreview } from "./MemberPreview";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MembersResponse {
  users: (User & { person_id?: number })[];
  total: number;
}

export function MembersTable() {
  const [selectedMember, setSelectedMember] = useState<User & { person_id?: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const { data, isLoading } = useQuery<MembersResponse>({
    queryKey: ["/api/admin/members", currentPage, itemsPerPage],
    queryFn: async () => {
      console.log('Fetching members data...');
      const response = await fetch(`/api/admin/members?page=${currentPage}&limit=${itemsPerPage}`);
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      console.log('Members data received:', data);
      return data;
    },
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
      cell: (row: User) => row.isVerified ? "Verified" : "Pending",
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
      onClick: (member: User & { person_id?: number }) => {
        console.log('Member selected:', member);
        setSelectedMember(member);
      },
    },
    {
      label: "Edit",
      onClick: (member: User & { person_id?: number }) => {
        console.log("Edit member:", member);
      },
    },
  ];

  const onRowClick = (member: User & { person_id?: number }) => {
    console.log('Row clicked, member data:', member);
    setSelectedMember(member);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <DataTable 
        data={users} 
        columns={columns} 
        actions={actions}
        onRowClick={onRowClick}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
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
                className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <PreviewSidebar 
        open={!!selectedMember} 
        onOpenChange={() => setSelectedMember(null)}
      >
        {selectedMember && (
          <MemberPreview member={selectedMember} />
        )}
      </PreviewSidebar>
    </div>
  );
}