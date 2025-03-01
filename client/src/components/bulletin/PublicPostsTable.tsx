import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PublicPostsTableProps {
  onSelect: (post: Post) => void;
}

export function PublicPostsTable({ onSelect }: PublicPostsTableProps) {
  const { data, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts");
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      return response.json();
    }
  });

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Latest Updates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.posts.map((post) => (
            <div 
              key={post.id}
              className="pb-4 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors p-2 rounded-lg"
              onClick={() => onSelect(post)}
            >
              <h4 className="font-medium">{post.title}</h4>
              {post.summary && (
                <p className="text-sm text-muted-foreground mt-1">
                  {post.summary}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(post.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
