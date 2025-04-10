import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Users, User, ExternalLink } from 'lucide-react';
import { formatUsernameForUrl } from '@/lib/utils';

interface CompanyMember {
  id: number;
  name: string;
  title: string | null;
  role: string;
  avatar: string | null;
}

interface CompanyMembersResponse {
  members: CompanyMember[];
}

interface CompanyMembersProps {
  nameSlug: string;
}

export default function CompanyMembers({ nameSlug }: CompanyMembersProps) {
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
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </CardTitle>
        </CardHeader>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </CardTitle>
        </CardHeader>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No team members found for this company.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display members
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.members.map((member) => (
          <Link 
            key={member.id} 
            href={`/people/${formatUsernameForUrl(member.name, member.id.toString())}`}
            className="flex items-center p-2 space-x-4 rounded-md hover:bg-muted transition-colors duration-200"
          >
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={member.avatar || undefined} alt={member.name} />
              <AvatarFallback>
                {member.name?.substring(0, 2).toUpperCase() || 'U'}
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
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}