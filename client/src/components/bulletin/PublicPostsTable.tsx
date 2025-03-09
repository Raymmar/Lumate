import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Plus, MoreVertical, Edit, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

// Export query key for reuse
export const PUBLIC_POSTS_QUERY_KEY = ["/api/public/posts"];

interface PublicPostsTableProps {
  onSelect: (post: Post, isEditing?: boolean) => void;
  onCreatePost?: () => void;
}

export function PublicPostsTable({ onSelect, onCreatePost }: PublicPostsTableProps) {
  const [displayCount, setDisplayCount] = useState(5);
  const { user } = useAuth();
  const { toast } = useToast();
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  const { data, isLoading, error } = useQuery<{ posts: Post[] }>({
    queryKey: PUBLIC_POSTS_QUERY_KEY,
  });

  // Sort posts by creation date (newest first)
  const sortedPosts = data?.posts?.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get the posts to display based on displayCount
  const displayedPosts = sortedPosts?.slice(0, displayCount);

  // Check if user can create posts (admin or has publish_content permission)
  const canCreatePosts = Boolean(user?.isAdmin || user?.permissions?.includes('publish_content'));

  // Check if user can edit a specific post
  const canEditPost = (post: Post) => {
    return Boolean(
      user?.isAdmin || // Admin can edit any post
      (post.creatorId === user?.id) // Post creator can edit their own posts
    );
  };

  const handleDeletePost = async (post: Post) => {
    try {
      await apiRequest(`/api/posts/${post.id}`, 'DELETE');
      await queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    } finally {
      setPostToDelete(null);
    }
  };

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
                className={`relative p-4 border cursor-pointer hover:bg-muted/50 transition-colors rounded-lg ${post.membersOnly && !user ? 'overflow-hidden' : ''}`}
                onClick={() => onSelect(post)}
              >
                {/* Members Only Overlay */}
                {post.membersOnly && !user && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      <span className="font-medium">Members Only Content</span>
                    </div>
                    <Link href="/login">
                      <Button variant="default">
                        Sign in to View
                      </Button>
                    </Link>
                  </div>
                )}

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
                              <Lock className="w-3 h-3" />
                              Members Only
                            </Badge>
                          )}
                        </div>
                      </h4>
                      {canEditPost(post) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect(post, true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostToDelete(post);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {post.summary && (
                      <p className="text-sm text-muted-foreground mt-1 text-wrap-balance max-w-[80ch] line-clamp-2">
                        {post.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{post.creator?.displayName || 'Unknown'}</span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post
              "{postToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => postToDelete && handleDeletePost(postToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}