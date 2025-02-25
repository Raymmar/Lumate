import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Person {
  api_id: string;
  email: string;
  created_at: string;
  event_approved_count: number;
  event_checked_in_count: number;
  revenue_usd_cents: number;
  user: {
    name: string | null;
    avatar_url: string;
  };
}

interface PeopleResponse {
  items: Person[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function PeopleDirectory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/people/sync');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync successful",
        description: `Synced ${data.count} people from Luma API`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/people'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query for fetching people
  const { data, isLoading, error, isFetching } = useQuery<PeopleResponse>({
    queryKey: ['/api/people', currentPage, debouncedSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/people?page=${currentPage}&limit=${pageSize}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (data?.hasMore) setCurrentPage(prev => prev + 1);
  };

  if (error) {
    return (
      <Card className="col-span-1">
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load people directory</p>
        </CardContent>
      </Card>
    );
  }

  const renderPeopleList = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      ));
    }

    if (!data?.items?.length) {
      return (
        <p className="text-muted-foreground p-4">
          {debouncedSearch ? "No matching people found" : "No people available. Click sync to load people from Luma."}
        </p>
      );
    }

    return data.items.map((person) => (
      <div
        key={person.api_id}
        className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors"
      >
        <Avatar>
          <AvatarImage src={person.user.avatar_url} alt={person.user.name || 'User avatar'} />
          <AvatarFallback>
            {person.user.name
              ? person.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{person.user.name || "Anonymous"}</p>
          <p className="text-sm text-muted-foreground">{person.email}</p>
        </div>
      </div>
    ));
  };

  return (
    <Card className="col-span-1">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
          {isFetching && <Skeleton className="h-4 w-4 rounded-full animate-spin" />}
        </div>

        <div className="space-y-4">
          {renderPeopleList()}
        </div>

        {data?.items && data.items.length > 0 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={handlePreviousPage} 
                  className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} ${isFetching ? 'cursor-wait' : ''}`}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4">
                  Page {currentPage} of {Math.ceil(data.total / pageSize)}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  onClick={handleNextPage}
                  className={`${!data?.hasMore ? 'pointer-events-none opacity-50' : ''} ${isFetching ? 'cursor-wait' : ''}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}