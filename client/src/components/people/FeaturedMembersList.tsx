import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatUsernameForUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

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

interface FeaturedMembersListProps {
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

function MemberItem({ person }: { person: Person }) {
  if (!person) return null;
  
  const initials = person.userName?.split(' ').map((n: string) => n?.[0] || '').join('') || person.email[0].toUpperCase();
  const profilePath = `/people/${encodeURIComponent(formatUsernameForUrl(person.userName, person.api_id))}`;

  return (
    <Link href={profilePath}>
      <div className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-muted/30 rounded-sm px-2 transition-colors cursor-pointer">
        <Avatar className="h-10 w-10">
          {person.avatarUrl ? (
            <AvatarImage src={person.avatarUrl} alt={person.userName || 'Profile'} />
          ) : (
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{person.userName || person.email}</h3>
          {(person.organizationName || person.jobTitle) && (
            <p className="text-xs text-muted-foreground truncate">
              {[person.jobTitle, person.organizationName].filter(Boolean).join(' @ ')}
            </p>
          )}
        </div>
        {person.user?.badges && person.user.badges.length > 0 && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {person.user.badges[0].name}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function FeaturedMembersList({ className = "" }: FeaturedMembersListProps) {
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
      <Card className={`w-full h-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Featured Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!featuredMembers || featuredMembers.length === 0) {
    return (
      <Card className={`w-full h-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Featured Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <User className="mx-auto h-12 w-12 mb-2 opacity-30" />
            <p>No featured members available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full h-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Featured Members</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div>
          {featuredMembers.map(person => (
            <MemberItem key={person.id} person={person} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}