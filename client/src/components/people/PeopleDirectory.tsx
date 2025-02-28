import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// existing interfaces remain unchanged
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
}

interface PeopleResponse {
  people: Person[];
  total: number;
}

export default function PeopleDirectory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1); // -1 means no focus
  const [isSearchActive, setIsSearchActive] = useState(false);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery<PeopleResponse>({
    queryKey: ['/api/people', currentPage, pageSize, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/people?page=${currentPage}&limit=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch people');
      return response.json();
    }
  });

  // Reset focused index when search query changes or search becomes inactive
  useEffect(() => {
    setFocusedIndex(isSearchActive ? 0 : -1);
  }, [searchQuery, isSearchActive]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePersonClick = (personId: string) => {
    setLocation(`/people/${personId}`);
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
          handlePersonClick(selectedPerson.api_id);
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
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsSearchActive(true)}
          onBlur={() => setIsSearchActive(false)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : data?.people && data.people.length > 0 ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-2">
              {data.people.map((person, index) => (
                <div
                  key={person.api_id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                    index === focusedIndex && isSearchActive
                      ? 'bg-muted ring-1 ring-inset ring-ring'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handlePersonClick(person.api_id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {person.userName
                        ? person.userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{person.userName || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t flex-none">
            <div className="text-xs text-muted-foreground mb-2">
              Showing {data.people.length} of {data.total} total people
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={handlePreviousPage} 
                    className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} text-xs`}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-xs">Page {currentPage} of {totalPages}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={handleNextPage}
                    className={`${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''} text-xs`}
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