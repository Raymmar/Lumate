import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { UserPlus, User, ExternalLink } from 'lucide-react';

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  organizationName: string | null;
  jobTitle: string | null;
}

interface PeopleResponse {
  people: Person[];
  total: number;
}

export default function PeopleDirectory() {
  const [, navigate] = useLocation();
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
      person.email.toLowerCase().includes(searchLower) ||
      person.fullName?.toLowerCase().includes(searchLower) ||
      person.organizationName?.toLowerCase().includes(searchLower) ||
      person.jobTitle?.toLowerCase().includes(searchLower)
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
      <Card>
        <CardContent>
          <p className="text-destructive">Failed to load people directory</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>People Directory</CardTitle>
        <CardDescription>
          Browse members from the Luma community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => navigate('/register')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : filteredPeople && filteredPeople.length > 0 ? (
          <>
            <div className="space-y-4">
              {filteredPeople.map((person) => (
                <div
                  key={person.api_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {person.avatarUrl ? (
                        <AvatarImage src={person.avatarUrl} alt={person.userName || "User"} />
                      ) : null}
                      <AvatarFallback>
                        {person.userName || person.fullName
                          ? ((person.userName || person.fullName) || "")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{person.userName || person.fullName || "Anonymous"}</p>
                        <Badge variant="outline" className="text-xs">
                          Luma Member
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{person.email}</p>
                      {(person.organizationName || person.jobTitle) && (
                        <p className="text-sm text-muted-foreground">
                          {person.jobTitle && <span>{person.jobTitle}</span>}
                          {person.jobTitle && person.organizationName && <span> at </span>}
                          {person.organizationName && <span>{person.organizationName}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end sm:ml-auto space-x-2 mt-2 sm:mt-0">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      asChild
                    >
                      <Link to={`/profile?email=${encodeURIComponent(person.email)}`}>
                        <User className="h-4 w-4 mr-1" />
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredPeople?.length || 0} of {data?.total || 0} total people
              </div>
              <Pagination>
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
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchQuery ? "No matching people found" : "No people available"}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')} 
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}