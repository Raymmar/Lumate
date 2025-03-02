import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import type { Person } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { PersonPreview } from "./PersonPreview";
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
  const itemsPerPage = 100;

  const { data, isLoading } = useQuery<PeopleResponse>({
    queryKey: ["/api/admin/people", currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/people?page=${currentPage}&limit=${itemsPerPage}`);
      if (!response.ok) throw new Error("Failed to fetch people");
      const data = await response.json();
      console.log("Fetched people data:", data); // Debug log
      return data;
    },
  });

  const people = data?.people || [];
  console.log("Processed people data:", people); // Debug log for processed data

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
    console.log("Row clicked, person data:", person); // Debug log for row click
    setSelectedPerson(person);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev < totalPages ? prev + 1 : prev);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <DataTable 
        data={people} 
        columns={columns} 
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