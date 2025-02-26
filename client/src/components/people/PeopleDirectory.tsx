import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  avatarUrl: string | null;
}

interface PeopleResponse {
  people: Person[];
  total: number;
}

export default function PeopleDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery<PeopleResponse>({
    queryKey: ['/api/people', currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/people?page=${currentPage}&limit=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  const filteredPeople = data?.people?.filter((person) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      person.userName?.toLowerCase().includes(searchLower) ||
      person.email.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  if (error) {
    return (
      <Card className="col-span-1">
        <CardContent>
          <p className="text-destructive">Failed to load people directory</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardContent className="pt-6">
        <Input
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : filteredPeople && filteredPeople.length > 0 ? (
          <>
            <div className="space-y-4">
              {filteredPeople.map((person) => (
                <div
                  key={person.api_id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground"
                >
                  <Avatar>
                    <AvatarFallback>
                      {person.userName
                        ? person.userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{person.userName || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{person.email}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={handlePreviousPage} 
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4">Page {currentPage} of {totalPages}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={handleNextPage}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        ) : (
          <p className="text-muted-foreground">
            {searchQuery ? "No matching people found" : "No people available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}