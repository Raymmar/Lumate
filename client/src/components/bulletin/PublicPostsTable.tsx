import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

// Export query key for reuse
export const PUBLIC_POSTS_QUERY_KEY = ["/api/public/posts"];

interface PublicPostsTableProps {
  onSelect: (post: Post) => void;
  onCreatePost?: () => void;
}

export function PublicPostsTable({ onSelect, onCreatePost }: PublicPostsTableProps) {
  const [displayCount, setDisplayCount] = useState(5);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<{ posts: Post[] }>({
    queryKey: PUBLIC_POSTS_QUERY_KEY,
  });

  // Sort posts by creation date only (newest first)
  const sortedPosts = data?.posts?.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get the posts to display based on displayCount
  const displayedPosts = sortedPosts?.slice(0, displayCount);

  // Check if user can create posts (admin or has publish_content permission)
  const canCreatePosts = Boolean(user?.isAdmin || user?.permissions?.includes('publish_content'));

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Community News</CardTitle>
          {canCreatePosts && onCreatePost && (
            <Button
              onClick={onCreatePost}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pb-4 border-b last:border-0">
                <div className="flex gap-4">
                  <Skeleton className="h-20 w-20 flex-shrink-0" />
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
        ) : !sortedPosts?.length ? (
          <div className="text-sm text-muted-foreground">
            No posts available at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts?.map((post) => (
              <div
                key={post.id}
                className="p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                onClick={() => onSelect(post)}
              >
                <div className="flex gap-4">
                  {post.featuredImage ? (
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={post.featuredImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '1 / 1' }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-wrap-balance max-w-[80ch] truncate">
                      {post.title}
                      {post.isPinned && (
                        <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          Featured
                        </span>
                      )}
                    </h4>
                    {post.summary && (
                      <p className="text-sm text-muted-foreground mt-1 text-wrap-balance max-w-[80ch] line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{post.creator?.name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{timeAgo.format(new Date(post.createdAt))}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More button */}
            {sortedPosts && displayCount < sortedPosts.length && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDisplayCount(prev => prev + 5);
                  }}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}