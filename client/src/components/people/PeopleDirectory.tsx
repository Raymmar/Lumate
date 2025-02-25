import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  people: Person[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export default function PeopleDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // Reduced page size for better performance

  const { data, isLoading, error, isFetching } = useQuery<PeopleResponse>({
    queryKey: ['/api/people', currentPage, searchQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/people?page=${currentPage}&limit=${pageSize}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

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

    if (!data?.people?.length) {
      return (
        <p className="text-muted-foreground p-4">
          {searchQuery ? "No matching people found" : "No people available"}
        </p>
      );
    }

    return data.people.map((person) => (
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="max-w-sm"
          />
          {isFetching && <Skeleton className="h-4 w-4 rounded-full animate-spin" />}
        </div>

        <div className="space-y-4">
          {renderPeopleList()}
        </div>

        {data?.people?.length > 0 && (
          <Pagination className="mt-6">
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
                  className={!data?.hasMore ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}