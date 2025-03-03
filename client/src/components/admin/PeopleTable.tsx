import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import type { Person } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { PersonPreview } from "./PersonPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PeopleResponse {
  people: Person[];
  total: number;
}

export function PeopleTable() {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300); // Reduced debounce time
  const itemsPerPage = 100;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/people", currentPage, itemsPerPage, debouncedSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/people?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (!response.ok) throw new Error("Failed to fetch people");
      const data = await response.json();
      return data as PeopleResponse;
    },
    keepPreviousData: true,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const people = data?.people || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const columns = [
    {
      key: "userName",
      header: "Name",
      cell: (row: Person) => row.userName || row.fullName || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: Person) => row.email,
    },
    {
      key: "organizationName",
      header: "Organization",
      cell: (row: Person) => row.organizationName || "—",
    },
    {
      key: "jobTitle",
      header: "Job Title",
      cell: (row: Person) => row.jobTitle || "—",
    }
  ];

  const onRowClick = (person: Person) => {
    setSelectedPerson(person);
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
        <h2 className="text-2xl font-semibold tracking-tight">People</h2>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search people..."
          isLoading={isFetching}
        />
      </div>

      <div className="min-h-[400px] relative">
        <div 
          className={`transition-opacity duration-300 ${
            isFetching ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <DataTable 
            data={people} 
            columns={columns} 
            onRowClick={onRowClick}
          />
        </div>
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

      <PreviewSidebar 
        open={!!selectedPerson} 
        onOpenChange={() => setSelectedPerson(null)}
      >
        {selectedPerson && (
          <PersonPreview person={selectedPerson} />
        )}
      </PreviewSidebar>
    </div>
  );
}