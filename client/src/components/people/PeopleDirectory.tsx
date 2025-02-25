import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Person {
  api_id: string;
  email: string;
  user: {
    name: string | null;
    avatar_url?: string;
  };
}

export default function PeopleDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: people, isLoading, error } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const filteredPeople = people?.filter((person) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      person.user.name?.toLowerCase().includes(searchLower) ||
      person.email.toLowerCase().includes(searchLower)
    );
  });

  if (error) {
    return (
      <Card className="col-span-1">
        <CardContent>
          <p className="text-destructive">Failed to load people directory</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardContent>
        <Input
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : filteredPeople && filteredPeople.length > 0 ? (
          <div className="space-y-4">
            {filteredPeople.map((person) => (
              <div
                key={person.api_id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground"
              >
                <Avatar>
                  <AvatarFallback>
                    {person.user.name
                      ? person.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{person.user.name || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {searchQuery ? "No matching people found" : "No people available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}