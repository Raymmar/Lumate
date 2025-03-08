import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
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

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface PublicPostsTableProps {
  onSelect: (post: Post, isEditing?: boolean) => void;
  onCreatePost?: () => void;
  isAdminView?: boolean;
}

// Export query keys for reuse
export const PUBLIC_POSTS_QUERY_KEY = "/api/public/posts";
export const ADMIN_POSTS_QUERY_KEY = "/api/admin/posts";

export function PublicPostsTable({ onSelect, onCreatePost, isAdminView }: PublicPostsTableProps) {
  const [displayCount, setDisplayCount] = useState(5);
  const { user } = useAuth();
  const { toast } = useToast();
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  const queryKey = isAdminView ? ADMIN_POSTS_QUERY_KEY : PUBLIC_POSTS_QUERY_KEY;

  const { data, isLoading, error } = useQuery<{ posts: Post[] }>({
    queryKey: [queryKey],
  });

  // Sort posts by creation date only (newest first)
  const sortedPosts = data?.posts?.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get the posts to display based on displayCount (only for public view)
  const displayedPosts = isAdminView ? sortedPosts : sortedPosts?.slice(0, displayCount);

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
      console.log('Deleting post:', post.id, 'isAdminView:', isAdminView);
      const endpoint = `/api/public/posts/${post.id}`;

      await apiRequest(endpoint, 'DELETE');

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });

      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete post",
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
          <CardTitle>{isAdminView ? "Posts Management" : "Community News"}</CardTitle>
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
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-wrap-balance max-w-[80ch] truncate">
                        {post.title}
                        {post.isPinned && (
                          <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            Featured
                          </span>
                        )}
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

            {/* Load More button - only shown in public view */}
            {!isAdminView && sortedPosts && displayCount < sortedPosts.length && (
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
        <AlertDialogContent onPointerDownOutside={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post
              "{postToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (postToDelete) {
                  handleDeletePost(postToDelete);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}