import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { formatUsernameForUrl } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Keep existing interfaces
export interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string | null;
  phoneNumber: string | null;
  bio: string | null;
  organizationName: string | null;
  jobTitle: string | null;
  stats: {
    totalEventsAttended: number;
    lastEventDate: string | null;
    firstEventDate: string | null;
    averageEventsPerYear?: number;
    lastUpdated: string;
  };
}

interface PeopleResponse {
  people: Person[];
  total: number;
}

interface PeopleDirectoryProps {
  onMobileSelect?: () => void; // New prop for mobile selection handling
}

export default function PeopleDirectory({ onMobileSelect }: PeopleDirectoryProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const params = useParams<{ username: string }>();
  const pageSize = 50;

  const { data, isLoading, error } = useQuery<PeopleResponse>({
    queryKey: ['/api/people', currentPage, pageSize, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/people?page=${currentPage}&limit=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort=events`);
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  useEffect(() => {
    setFocusedIndex(searchQuery.length > 0 ? 0 : -1);
    setIsSearchActive(searchQuery.length > 0);
  }, [searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePersonClick = (person: Person) => {
    const urlPath = formatUsernameForUrl(person.userName, person.api_id);
    setLocation(`/people/${encodeURIComponent(urlPath)}`);
    // Call onMobileSelect when provided (mobile view)
    if (onMobileSelect) {
      onMobileSelect();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!data?.people.length || !isSearchActive) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, data.people.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selectedPerson = data.people[focusedIndex];
        if (selectedPerson) {
          handlePersonClick(selectedPerson);
        }
        break;
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 p-3">
        <p className="text-xs text-destructive">Failed to load people directory</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {isLoading ? (
        <div className="space-y-0.5">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : data?.people && data.people.length > 0 ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-0.5">
              {data.people.map((person, index) => {
                const urlPath = formatUsernameForUrl(person.userName, person.api_id);
                return (
                  <div
                    key={person.api_id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                      (index === focusedIndex && isSearchActive) || (!isSearchActive && params?.username === urlPath)
                        ? 'bg-muted ring-1 ring-inset ring-ring'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handlePersonClick(person)}
                  >
                    <Avatar className="h-8 w-8">
                      {person.avatarUrl ? (
                        <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
                      ) : (
                        <AvatarFallback className="text-sm">
                          {person.userName
                            ? person.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                            : "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium truncate">
                        {person.userName || "Anonymous"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex-none pt-2 mt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              Showing {data.people.length} of {data.total} total people
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={handlePreviousPage}
                    className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} text-xs hover:bg-muted`}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-xs">
                    {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={handleNextPage}
                    className={`${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''} text-xs hover:bg-muted`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {searchQuery ? "No matching people found" : "No people available"}
        </p>
      )}
    </div>
  );
}