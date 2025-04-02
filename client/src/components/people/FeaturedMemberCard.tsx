import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatUsernameForUrl } from "@/lib/utils";
import { getBadgeIcon } from "@/lib/badge-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import React from "react";

interface Person {
  id: number;
  api_id: string;
  email: string;
  userName: string;
  avatarUrl: string | null;
  role: string | null;
  organizationName?: string | null;
  jobTitle?: string | null;
  isAdmin?: boolean;
  user?: {
    id: number;
    email: string;
    displayName: string;
    bio: string;
    isAdmin: boolean;
    badges?: {
      id: number;
      name: string;
      description: string | null;
      icon: string;
      isAutomatic: boolean;
    }[];
  };
}

interface FeaturedMemberCardProps {
  personId?: number;
  className?: string;
}

export function FeaturedMemberCard({ personId, className = "" }: FeaturedMemberCardProps) {
  const { data: people, isLoading: peopleLoading } = useQuery<Person[]>({
    queryKey: ["/api/people"],
    queryFn: async () => {
      const response = await fetch("/api/people?limit=50");
      if (!response.ok) {
        throw new Error("Failed to fetch people");
      }
      return response.json();
    },
    enabled: !personId, // Only fetch people if no specific personId is provided
  });

  const { data: specificPerson, isLoading: specificPersonLoading } = useQuery<Person>({
    queryKey: ["/api/people", personId],
    queryFn: async () => {
      const response = await fetch(`/api/people/${personId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch specific person");
      }
      return response.json();
    },
    enabled: !!personId, // Only fetch if personId is provided
  });

  // If personId is provided, use that person, otherwise randomly select one from the list
  const person = specificPerson || (people && people.length > 0 
    ? people[Math.floor(Math.random() * people.length)]
    : null);

  const isLoading = personId ? specificPersonLoading : peopleLoading;

  if (isLoading) {
    return (
      <Card className={`w-full h-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center text-lg">
            <span>Featured Member</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!person) {
    return (
      <Card className={`w-full h-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Featured Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-2 opacity-30" />
            <p>No members available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const initials = person.userName?.split(' ').map(n => n?.[0] || '').join('') || person.email[0].toUpperCase();
  const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;

  return (
    <Card className={`w-full h-full flex flex-col ${className}`}>
      <CardHeader className="pb-2 flex-none">
        <CardTitle className="flex justify-between items-center text-lg">
          <span>Featured Member</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            {person.avatarUrl ? (
              <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
            ) : (
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold">{person.userName || person.email}</h3>
            {(person.organizationName || person.jobTitle) && (
              <p className="text-sm text-muted-foreground">
                {[person.jobTitle, person.organizationName].filter(Boolean).join(' @ ')}
              </p>
            )}
          </div>
        </div>

        {person.user?.bio && (
          <p className="text-sm line-clamp-4 flex-grow">{person.user.bio}</p>
        )}

        {person.user?.badges && person.user.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {person.user.badges.slice(0, 3).map(badge => {
              // Use a simpler approach without direct component rendering
              return (
                <Badge key={badge.id} variant="secondary" className="gap-1">
                  {badge.name}
                </Badge>
              );
            })}
            {person.user.badges.length > 3 && (
              <Badge variant="outline">+{person.user.badges.length - 3} more</Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Link href={profilePath}>
            <Button variant="outline" className="w-full">View Profile</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}