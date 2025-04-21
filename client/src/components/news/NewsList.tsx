import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Lock } from "lucide-react";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import type { Post } from "@shared/schema";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

interface NewsListProps {
  posts: Post[];
  isLoading: boolean;
  onSelect: (post: Post) => void;
  canCreatePosts?: boolean;
}

export function NewsList({ posts, isLoading, onSelect, canCreatePosts = false }: NewsListProps) {
  const [displayCount, setDisplayCount] = useState(6);
  
  const sortedPosts = posts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const displayedPosts = sortedPosts.slice(0, displayCount);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Posts</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 pb-4 border-b animate-pulse">
                <div className="w-full sm:w-20 h-16 bg-muted rounded-md flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedPosts.map((post) => (
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
                        alt={post.title}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '16 / 9' }}
                        onError={(e) => {
                          // Add a fallback for when image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10 text-muted-foreground/50"><path d="M15 8h.01"></path><rect width="16" height="16" x="4" y="4" rx="3"></rect><path d="m4 15 4-4a3 5 0 0 1 3 0l5 5"></path><path d="m14 14 1-1a3 5 0 0 1 3 0l2 2"></path></svg></div>';
                          }
                        }}
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