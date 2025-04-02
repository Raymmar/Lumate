import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatUsernameForUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import React, { useState, useEffect } from "react";

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

interface FeaturedMembersGridProps {
  className?: string;
}

// Create a Local Storage key with a 24-hour expiry
function getFeaturedMembersWithExpiry() {
  try {
    const item = localStorage.getItem('featuredMembers');
    if (!item) return null;
    
    const storedItem = JSON.parse(item);
    const now = new Date();
    
    // Check if the item is expired (24 hours)
    if (now.getTime() > storedItem.expiry) {
      localStorage.removeItem('featuredMembers');
      return null;
    }
    
    return storedItem.value;
  } catch (e) {
    console.error('Error reading from localStorage', e);
    return null;
  }
}

// Save featured members with expiry
function setFeaturedMembersWithExpiry(value: Person[]) {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + (24 * 60 * 60 * 1000), // 24 hours
  };
  
  try {
    localStorage.setItem('featuredMembers', JSON.stringify(item));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}

function MemberCard({ person }: { person: Person }) {
  if (!person) return null;
  
  const initials = person.userName?.split(' ').map((n: string) => n?.[0] || '').join('') || person.email[0].toUpperCase();
  const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;

  return (
    <Link href={profilePath}>
      <Card className="w-full h-full flex flex-col hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex-1 flex flex-col">
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
            <p className="text-sm mt-3 line-clamp-3 flex-grow">{person.user.bio}</p>
          )}

          {person.user?.badges && person.user.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {person.user.badges.slice(0, 2).map((badge: { id: number, name: string, description: string | null, icon: string, isAutomatic: boolean }) => (
                <Badge key={badge.id} variant="secondary" className="gap-1">
                  {badge.name}
                </Badge>
              ))}
              {person.user.badges.length > 2 && (
                <Badge variant="outline">+{person.user.badges.length - 2} more</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function FeaturedMembersGrid({ className = "" }: FeaturedMembersGridProps) {
  // State to hold the selected members
  const [featuredMembers, setFeaturedMembers] = useState<Person[] | null>(null);

  // Fetch founding members
  const { data: foundingMembersData, isLoading: foundingMembersLoading } = useQuery<{ badge: { id: number, name: string }, users: Member[] }>({
    queryKey: ["/api/badges/Founding Member/users"],
    queryFn: async () => {
      // Use the same endpoint that's used on the About page to fetch founding members
      const response = await fetch("/api/badges/Founding Member/users");
      if (!response.ok) {
        throw new Error("Failed to fetch founding members");
      }
      return response.json();
    },
  });

  // Helper function to convert member data to the format our component expects
  const getMemberPerson = (member: Member): Person | null => {
    if (!member || !member.person) return null;
    
    return {
      ...member.person,
      user: {
        id: member.id,
        email: member.email,
        displayName: member.displayName || member.email?.split('@')[0],
        bio: member.bio || "",
        isAdmin: member.isAdmin || false,
        badges: member.badges || []
      }
    };
  };

  // Fisher-Yates shuffling algorithm
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Setup featured members when data loads, using localStorage for persistence
  useEffect(() => {
    // First check if we have valid cached members
    const cachedMembers = getFeaturedMembersWithExpiry();
    if (cachedMembers) {
      setFeaturedMembers(cachedMembers);
      return;
    }

    // Otherwise, select new members if data is loaded
    if (foundingMembersData?.users && foundingMembersData.users.length > 0) {
      const allMembers = foundingMembersData.users
        .map(member => getMemberPerson(member))
        .filter(Boolean) as Person[];
        
      if (allMembers.length) {
        // Shuffle the array and take the first 3 (or less if fewer are available)
        const selectedMembers = shuffleArray(allMembers).slice(0, 3);
        setFeaturedMembers(selectedMembers);
        
        // Cache the selected members
        setFeaturedMembersWithExpiry(selectedMembers);
      }
    }
  }, [foundingMembersData]);

  if (foundingMembersLoading) {
    return (
      <div className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Featured Members</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="w-full">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!featuredMembers || featuredMembers.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Featured Members</CardTitle>
        </CardHeader>
        <Card className="w-full">
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-2 opacity-30" />
              <p>No featured members available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Featured Members</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featuredMembers.map(person => (
          <MemberCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}