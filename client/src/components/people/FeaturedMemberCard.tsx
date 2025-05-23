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
    badges?: Array<{
      id: number;
      name: string;
      description: string | null;
      icon: string;
      isAutomatic: boolean;
    }>;
  };
}

interface Member {
  id: number;
  email: string;
  displayName?: string;
  bio?: string;
  isAdmin?: boolean;
  badges?: Array<{
    id: number;
    name: string;
    description: string | null;
    icon: string;
    isAutomatic: boolean;
  }>;
  person?: Person;
}

interface FeaturedMemberCardProps {
  personId?: number;
  className?: string;
}

export function FeaturedMemberCard({
  personId,
  className = "",
}: FeaturedMemberCardProps) {
  // If personId is provided, fetch that specific person
  const { data: specificPerson, isLoading: specificPersonLoading } =
    useQuery<Person>({
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

  // Fetch the featured member from our new endpoint (cached for 24 hours on the server)
  const { data: featuredMember, isLoading: featuredMemberLoading } =
    useQuery<Person>({
      queryKey: ["/api/people/featured"],
      queryFn: async () => {
        const response = await fetch("/api/people/featured");
        if (!response.ok) {
          throw new Error("Failed to fetch featured member");
        }
        return response.json();
      },
      enabled: !personId, // Only fetch if no specific personId is provided
      staleTime: 60 * 60 * 1000, // Cache for 1 hour on the client side
    });

  // Fallback to founding members if featured member is not available
  const { data: foundingMembersData, isLoading: foundingMembersLoading } =
    useQuery<{ badge: { id: number; name: string }; users: Member[] }>({
      queryKey: ["/api/badges/Founding Member/users"],
      queryFn: async () => {
        const response = await fetch("/api/badges/Founding Member/users");
        if (!response.ok) {
          throw new Error("Failed to fetch founding members");
        }
        return response.json();
      },
      enabled: !personId && !featuredMember, // Only fetch if no specific personId or featured member is provided
    });

  // Extract users from founding members data
  const foundingMembers = foundingMembersData?.users || [];

  // Helper function to convert member data to the format our component expects
  const getMemberPerson = (member: Member): Person | null => {
    if (!member || !member.person) return null;

    return {
      ...member.person,
      user: {
        id: member.id,
        email: member.email,
        displayName: member.displayName || member.email?.split("@")[0],
        bio: member.bio || "",
        isAdmin: member.isAdmin || false,
        badges: member.badges || [],
      },
    };
  };

  // If personId is provided, use that person
  // Otherwise use the featured member from our new endpoint
  // Finally fall back to a random founding member
  const person =
    specificPerson ||
    featuredMember ||
    (foundingMembers.length > 0
      ? getMemberPerson(
          foundingMembers[Math.floor(Math.random() * foundingMembers.length)],
        )
      : null);

  const isLoading =
    (personId ? specificPersonLoading : false) ||
    (!personId ? featuredMemberLoading : false) ||
    (!personId && !featuredMember ? foundingMembersLoading : false);

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

  const initials =
    person.userName
      ?.split(" ")
      .map((n: string) => n?.[0] || "")
      .join("") || person.email[0].toUpperCase();
  const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;

  return (
    <Link href={profilePath} className="group block w-full h-full">
      <Card className={`w-full h-full flex flex-col ${className} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-2 flex-none">
          <CardTitle className="flex justify-between items-center text-lg">
            <span>Featured Member</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 transition-all group-hover:shadow-md">
              {person.avatarUrl ? (
                <AvatarImage
                  src={person.avatarUrl}
                  alt={person.userName || "Profile"}
                />
              ) : (
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold group-hover:underline">{person.userName || person.email}</h3>
              {(person.organizationName || person.jobTitle) && (
                <p className="text-sm text-muted-foreground">
                  {[person.jobTitle, person.organizationName]
                    .filter(Boolean)
                    .join(" @ ")}
                </p>
              )}
            </div>
          </div>

          {person.user?.bio && (
            <p className="text-sm line-clamp-4 flex-grow">{person.user.bio}</p>
          )}

          {person.user?.badges && person.user.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {person.user.badges
                .slice(0, 5)
                .map(
                  (badge: {
                    id: number;
                    name: string;
                    description: string | null;
                    icon: string;
                    isAutomatic: boolean;
                  }) => {
                    // Use a simpler approach without direct component rendering
                    return (
                      <Badge key={badge.id} variant="secondary" className="gap-1">
                        {badge.name}
                      </Badge>
                    );
                  },
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
