import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Lock } from 'lucide-react';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import type { Post } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface NewsListProps {
  posts: Post[];
  isLoading: boolean;
  onSelect: (post: Post) => void;
  canCreatePosts?: boolean;
}

export function NewsList({ posts, isLoading, onSelect, canCreatePosts = false }: NewsListProps) {
  const [displayCount, setDisplayCount] = useState(6);
  const { user } = useAuth();

  // Filter out members-only posts for non-authenticated users
  const filteredPosts = posts.filter(post => !post.membersOnly || user);

  // Sort posts by creation date (newest first)
  const sortedPosts = [...filteredPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get the posts to display based on the current display count
  const displayedPosts = sortedPosts.slice(0, displayCount);

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Latest News</CardTitle>
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
        ) : !sortedPosts?.length ? (
          <div className="text-sm text-muted-foreground">
            No posts available at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts?.map((post) => (
              <div
                key={post.id}
                className="pb-4 border-b last:border-0 cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
                onClick={() => onSelect(post)}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {post.featuredImage ? (
                    <div className="w-full sm:w-20 h-auto sm:h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={post.featuredImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '16 / 9' }}
                      />
                    </div>
                  ) : (
                    <div className="w-full sm:w-20 h-auto sm:h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0" style={{ aspectRatio: '16 / 9' }}>
                      <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-wrap-balance max-w-[80ch] truncate flex items-center gap-2">
                        {post.title}
                        <div className="flex gap-2">
                          {post.isPinned && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                          {post.membersOnly && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Members
                            </Badge>
                          )}
                        </div>
                      </h4>
                    </div>
                    {post.summary && (
                      <p className="text-sm text-muted-foreground mt-1 mb-2 line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <span className="mr-2">
                        {post.creator?.displayName || "Admin"}
                      </span>
                      <span>
                        {timeAgo.format(new Date(post.createdAt))}
                      </span>
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
                    setDisplayCount(prev => prev + 6);
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