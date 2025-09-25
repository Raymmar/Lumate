import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import type { Person } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { PersonPreview } from "./PersonPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { formatUsernameForUrl } from "@/lib/utils";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [, setLocation] = useLocation();
  const debouncedSearch = useDebounce(searchQuery, 300);
  const itemsPerPage = 100;
  const { toast } = useToast();

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
    refetchOnWindowFocus: false,
  });

  const people = data?.people || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Query to get unclaimed people count for the batch invite button
  const { data: unclaimedData } = useQuery({
    queryKey: ["/api/admin/people/unclaimed"],
    queryFn: async () => {
      const response = await fetch("/api/admin/people/unclaimed");
      if (!response.ok) throw new Error("Failed to fetch unclaimed people");
      return response.json() as Person[];
    },
    refetchOnWindowFocus: false,
  });

  const unclaimedCount = unclaimedData?.length || 0;

  // Batch invite mutation
  const batchInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/batch-invite-people', 'POST');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Batch Invite Complete",
        description: data.message,
      });
      // Refresh the unclaimed people query
      queryClient.invalidateQueries({ queryKey: ["/api/admin/people/unclaimed"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send batch invites",
        variant: "destructive",
      });
    },
  });

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
    const urlPath = formatUsernameForUrl(person.userName, person.api_id);
    setSelectedPerson(person);
    setLocation(`/people/${encodeURIComponent(urlPath)}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handleNavigate = (person: Person) => {
    const urlPath = formatUsernameForUrl(person.userName, person.api_id);
    setSelectedPerson(person);
    setLocation(`/people/${encodeURIComponent(urlPath)}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <div className="flex items-center gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={unclaimedCount === 0 || batchInviteMutation.isPending}
                data-testid="button-batch-invite"
              >
                {batchInviteMutation.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Batch Invite ({unclaimedCount})
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send Batch Invitations</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send invitation emails to all {unclaimedCount} people who have profiles but haven't claimed their accounts yet. They'll receive an email with a link to set their password and claim their profile.
                  <br /><br />
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => batchInviteMutation.mutate()}
                  data-testid="button-confirm-batch-invite"
                >
                  Send {unclaimedCount} Invitations
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search people..."
            isLoading={isFetching}
          />
        </div>
      </div>

      <div className="min-h-[400px] relative mt-4">
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

      <div className="flex items-center justify-between mt-4">
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
          <PersonPreview 
            person={selectedPerson}
            people={people}
            onNavigate={handleNavigate}
          />
        )}
      </PreviewSidebar>
    </div>
  );
}