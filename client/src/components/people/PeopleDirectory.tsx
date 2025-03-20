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
  isCurrentUser?: boolean;
  user?: {
    id: number;
    isVerified: boolean;
    [key: string]: any;
  }; // Added to accommodate the filter
}

interface PeopleResponse {
  people: Person[];
  total: number;
  currentUserId?: string;
}

interface PeopleDirectoryProps {
  onMobileSelect?: () => void;
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
      console.log('Fetching people with params:', { currentPage, pageSize, searchQuery });
      const response = await fetch(`/api/people?page=${currentPage}&limit=${pageSize}&search=${encodeURIComponent(searchQuery)}&sort=events`);
      if (!response.ok) throw new Error('Failed to fetch people');
      const data = await response.json();
      console.log('People data received:', data);
      return data;
    }
  });

  // Filter and sort people array to show only those with linked user accounts
  const sortedPeople = React.useMemo(() => {
    if (!data?.people) return [];
    console.log('Processing people data:', data.people.length, 'total records');
    const filteredPeople = data.people.filter(person => {
      console.log('Checking person:', person.userName, 'has user:', !!person.user);
      // Changed filtering logic to be more specific
      return person.user?.id != null;
    });
    console.log('Filtered to', filteredPeople.length, 'verified members');
    return filteredPeople.sort((a, b) => {
      if (a.api_id === data.currentUserId) return -1;
      if (b.api_id === data.currentUserId) return 1;
      return 0;
    });
  }, [data?.people, data?.currentUserId]);

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
    if (onMobileSelect) {
      onMobileSelect();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!sortedPeople.length || !isSearchActive) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, sortedPeople.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selectedPerson = sortedPeople[focusedIndex];
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
      ) : sortedPeople && sortedPeople.length > 0 ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-0.5">
              {sortedPeople.map((person, index) => {
                const urlPath = formatUsernameForUrl(person.userName, person.api_id);
                const isCurrentUser = person.api_id === data?.currentUserId;
                return (
                  <div
                    key={person.api_id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                      (index === focusedIndex && isSearchActive) || (!isSearchActive && params?.username === urlPath)
                        ? 'bg-muted ring-1 ring-inset ring-ring'
                        : 'hover:bg-muted/50'
                    } ${isCurrentUser ? 'bg-primary/10' : ''}`}
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
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex-none pt-2 mt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              Showing {sortedPeople.length} verified members
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
        <div className="text-center p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            {searchQuery 
              ? "No matching verified members found" 
              : "No verified members available"}
          </p>
          <p className="text-xs text-muted-foreground">
            To appear in the directory, please claim and verify your profile
          </p>
        </div>
      )}
    </div>
  );
}