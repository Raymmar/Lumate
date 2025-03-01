import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

interface PublicPostsTableProps {
  onSelect: (post: Post) => void;
}

export function PublicPostsTable({ onSelect }: PublicPostsTableProps) {
  console.log("PublicPostsTable: Rendering");

  const { data, isLoading, error } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
    queryFn: async () => {
      console.log("PublicPostsTable: Fetching posts");
      const response = await fetch("/api/public/posts");
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      console.log("PublicPostsTable: Received posts", data);
      return data;
    }
  });

  console.log("PublicPostsTable state:", { isLoading, error, postsCount: data?.posts?.length });

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Community News</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pb-4 border-b last:border-0">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">
            Failed to load posts. Please try again later.
          </div>
        ) : !data?.posts?.length ? (
          <div className="text-sm text-muted-foreground">
            No posts available at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {data.posts.map((post) => (
              <div 
                key={post.id}
                className="p-4 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg -mx-6"
                onClick={() => {
                  console.log("PublicPostsTable: Post clicked", post);
                  onSelect(post);
                }}
              >
                <div className="flex gap-4">
                  {post.featuredImage ? (
                    <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={post.featuredImage} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}