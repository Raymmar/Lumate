import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "./DataTable";
import type { PersonWithWorkflow } from "@shared/schema";
import { useState } from "react";
import { PreviewSidebar } from "./PreviewSidebar";
import { PersonPreview } from "./PersonPreview";
import { SearchInput } from "./SearchInput";
import { useDebounce } from "@/hooks/useDebounce";
import { formatUsernameForUrl } from "@/lib/utils";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Users, Send } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PeopleResponse {
  people: PersonWithWorkflow[];
  total: number;
}

export function PeopleTable() {
  const [selectedPerson, setSelectedPerson] = useState<PersonWithWorkflow | null>(null);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const debouncedSearch = useDebounce(searchQuery, 300);
  const itemsPerPage = 100;
  const { toast } = useToast();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["/api/admin/people", currentPage, itemsPerPage, debouncedSearch, workflowFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: debouncedSearch,
      });
      
      if (workflowFilter !== "all") {
        params.append("workflowStatus", workflowFilter);
      }

      const response = await fetch(`/api/admin/people?${params}`);
      if (!response.ok) throw new Error("Failed to fetch people");
      const data = await response.json();
      return data as PeopleResponse;
    },
    refetchOnWindowFocus: false,
  });

  const people = data?.people || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Fetch workflow stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/admin/workflow-stats"],
    refetchOnWindowFocus: false,
  });

  // Enroll in workflow mutation
  const enrollMutation = useMutation({
    mutationFn: async (personIds: number[]) => {
      return await apiRequest('/api/admin/enroll-in-workflow', 'POST', { personIds });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Enrollment Complete",
        description: data.message,
      });
      setSelectedPeopleIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/workflow-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll people",
        variant: "destructive",
      });
    },
  });

  const handleToggleSelect = (personId: number) => {
    const newSelected = new Set(selectedPeopleIds);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedPeopleIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPeopleIds.size === people.length) {
      setSelectedPeopleIds(new Set());
    } else {
      setSelectedPeopleIds(new Set(people.map(p => p.id)));
    }
  };

  const handleEnrollSelected = () => {
    if (selectedPeopleIds.size === 0) return;
    enrollMutation.mutate(Array.from(selectedPeopleIds));
  };

  const columns = [
    {
      key: "select",
      header: () => (
        <Checkbox
          checked={selectedPeopleIds.size === people.length && people.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
          data-testid="checkbox-select-all"
        />
      ),
      cell: (row: PersonWithWorkflow) => (
        <Checkbox
          checked={selectedPeopleIds.has(row.id)}
          onCheckedChange={() => handleToggleSelect(row.id)}
          aria-label={`Select ${row.userName || row.email}`}
          data-testid={`checkbox-select-${row.id}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "userName",
      header: "Name",
      cell: (row: PersonWithWorkflow) => row.userName || row.fullName || "—",
    },
    {
      key: "email",
      header: "Email",
      cell: (row: PersonWithWorkflow) => row.email,
    },
    {
      key: "claimed",
      header: "Claimed",
      cell: (row: PersonWithWorkflow) => (
        <span className={row.hasUser ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
          {row.hasUser ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "workflowStatus",
      header: "Status",
      cell: (row: PersonWithWorkflow) => {
        const statusConfig = {
          not_started: { label: "Not Started", color: "text-gray-600 dark:text-gray-400" },
          in_progress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400" },
          completed: { label: "Completed", color: "text-green-600 dark:text-green-400" },
          opted_out: { label: "Opted Out", color: "text-red-600 dark:text-red-400" },
        };
        const config = statusConfig[row.workflowStatus];
        return <span className={config.color}>{config.label}</span>;
      },
    },
    {
      key: "emailsSentCount",
      header: "Emails Sent",
      cell: (row: PersonWithWorkflow) => row.emailsSentCount || 0,
    },
    {
      key: "lastSentAt",
      header: "Last Sent",
      cell: (row: PersonWithWorkflow) => 
        row.lastSentAt ? new Date(row.lastSentAt).toLocaleDateString() : "—",
    },
    {
      key: "nextSendAt",
      header: "Next Send",
      cell: (row: PersonWithWorkflow) => 
        row.nextSendAt ? new Date(row.nextSendAt).toLocaleDateString() : "—",
    },
  ];

  const onRowClick = (person: PersonWithWorkflow) => {
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

  const handleNavigate = (person: PersonWithWorkflow) => {
    const urlPath = formatUsernameForUrl(person.userName, person.api_id);
    setSelectedPerson(person);
    setLocation(`/people/${encodeURIComponent(urlPath)}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">People & Onboarding</h1>
        
        {statsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total People</div>
              <div className="text-2xl font-bold mt-1">{statsData.totalPeople}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Claimed</div>
              <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{statsData.claimedUsers}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold mt-1">{statsData.conversionRate}%</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">In Workflow</div>
              <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{statsData.inWorkflow}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{statsData.completedWorkflow}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Opted Out</div>
              <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{statsData.optedOut}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Invites Sent</div>
              <div className="text-2xl font-bold mt-1">{statsData.totalInvitesSent}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Workflow Rate</div>
              <div className="text-2xl font-bold mt-1">{statsData.workflowConversionRate}%</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold">Manage Invitations</div>
        <div className="flex items-center gap-3">
          {selectedPeopleIds.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default"
                  disabled={enrollMutation.isPending}
                  data-testid="button-enroll-selected"
                >
                  {enrollMutation.isPending ? (
                    "Enrolling..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enroll {selectedPeopleIds.size} in Workflow
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enroll in Automated Workflow</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will enroll {selectedPeopleIds.size} selected {selectedPeopleIds.size === 1 ? 'person' : 'people'} in the automated email invitation workflow. They will receive a series of follow-up emails over time encouraging them to claim their account.
                    <br /><br />
                    People who already have accounts or are already in the workflow will be skipped.
                    <br /><br />
                    Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleEnrollSelected}
                    data-testid="button-confirm-enroll"
                  >
                    Enroll {selectedPeopleIds.size} {selectedPeopleIds.size === 1 ? 'Person' : 'People'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-workflow-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="opted_out">Opted Out</SelectItem>
            </SelectContent>
          </Select>
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