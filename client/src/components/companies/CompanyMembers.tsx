import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Users, User, ExternalLink, Mail } from 'lucide-react';
import { formatUsernameForUrl } from '@/lib/utils';

interface CompanyMember {
  id: number;
  name: string;
  title: string | null;
  role: string;
  avatar: string | null;
  email: string | null;
}

interface CompanyMembersResponse {
  members: CompanyMember[];
}

interface CompanyMembersProps {
  nameSlug: string;
  displayMode?: 'card' | 'grid' | 'list';
  showTitle?: boolean;
}

export default function CompanyMembers({ 
  nameSlug, 
  displayMode = 'card',
  showTitle = true 
}: CompanyMembersProps) {
  const { data, isLoading, error } = useQuery<CompanyMembersResponse>({
    queryKey: [`/api/companies/by-name/${nameSlug}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/companies/by-name/${nameSlug}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch company members');
      }
      return response.json();
    }
  });

  // Handle loading state
  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Failed to load team members. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no members or empty response
  if (!data || !data.members || data.members.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No team members found for this company.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate fallback initials for avatar
  const getInitials = (name: string): string => {
    // Handle cases like "anonymous" with just first letter capitalized
    if (!name.includes(' ')) {
      return name.substring(0, 2).toUpperCase();
    }
    
    // For full names, get first letter of first and last name
    const nameParts = name.split(' ');
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };

  // Grid layout for multiple members
  if (displayMode === 'grid') {
    return (
      <div>
        {showTitle && (
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </h3>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.members.map((member) => (
            <Link 
              key={member.id} 
              href={`/people/${formatUsernameForUrl(member.name, member.id.toString())}`}
            >
              <Card className="h-full hover:bg-muted/50 transition-colors duration-200">
                <CardContent className="pt-6 text-center flex flex-col items-center">
                  <Avatar className="h-20 w-20 mb-4 border">
                    <AvatarImage src={member.avatar || undefined} alt={member.name} />
                    <AvatarFallback className="text-lg">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="font-medium line-clamp-1">{member.name}</h4>
                    {member.title && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{member.title}</p>
                    )}
                    {member.role === 'admin' && (
                      <Badge variant="secondary" className="mt-2">Admin</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Display members in standard card
  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {data.members.map((member) => (
          <Link 
            key={member.id} 
            href={`/people/${formatUsernameForUrl(member.name, member.id.toString())}`}
            className="flex items-center p-3 space-x-4 rounded-md hover:bg-muted transition-colors duration-200 border border-transparent hover:border-border"
          >
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={member.avatar || undefined} alt={member.name} />
              <AvatarFallback>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {member.role === 'admin' && (
                    <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {member.title && (
                <p className="text-xs text-muted-foreground truncate">{member.title}</p>
              )}
              {member.email && (
                <div className="flex items-center mt-1">
                  <Mail className="h-3 w-3 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}