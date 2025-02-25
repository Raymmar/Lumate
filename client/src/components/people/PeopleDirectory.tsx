import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface Person {
  api_id: string;
  email: string;
  full_name: string;
  role?: string;
}

export default function PeopleDirectory() {
  const { data: people, isLoading, error } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            People Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load people directory</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          People Directory
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <div className="space-y-4">
            {people?.map((person) => (
              <div
                key={person.api_id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground"
              >
                <Avatar>
                  <AvatarFallback>
                    {person.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{person.full_name}</p>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                  {person.role && (
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}