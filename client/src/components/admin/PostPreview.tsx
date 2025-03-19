import { Post, type InsertPost } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, Lock } from "lucide-react";
import { PostForm } from "./PostForm";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect, useState } from 'react';
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PUBLIC_POSTS_QUERY_KEY } from "../bulletin/PublicPostsTable";
import { useAuth } from "@/hooks/use-auth";
import { Link as RouterLink } from "wouter";
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

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface PostPreviewProps {
  post?: Post;
  isNew?: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onSave?: (data: InsertPost) => Promise<void>;
  readOnly?: boolean;
  posts?: Post[];
  onNavigate?: (post: Post) => void;
}

export function PostPreview({
  post,
  isNew = false,
  isEditing = false,
  onClose,
  onSave,
  readOnly = false,
  posts = [],
  onNavigate
}: PostPreviewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  // Check if user can edit this post
  const canEditPost = post && (user?.isAdmin || post.creatorId === user?.id);

  // Filter out members-only posts from navigation if user is not authenticated
  const availablePosts = posts.filter(p => !p.membersOnly || user);
  const currentIndex = availablePosts.findIndex(p => p.id === post?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < availablePosts.length - 1;

  // Handle navigation
  const handleNavigate = async (nextPost: Post) => {
    try {
      // Check if post is members-only
      if (nextPost.membersOnly && !user) {
        setError("Members only content");
        return;
      }

      if (editor) {
        editor.commands.clearContent();
      }
      onNavigate?.(nextPost);
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Error",
        description: "Failed to navigate to post",
        variant: "destructive"
      });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          class: 'text-primary underline decoration-primary cursor-pointer'
        }
      })
    ],
    content: '',
    editable: false,
  });

  // Update editor content when post changes
  useEffect(() => {
    if (editor && post?.body !== undefined) {
      editor.commands.clearContent();
      if (post.body) {
        editor.commands.setContent(post.body);
      }
    }
  }, [editor, post?.body]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const handleUpdatePost = async (data: InsertPost) => {
    try {
      await apiRequest(`/api/posts/${post!.id}`, 'PATCH', data);

      // Invalidate queries first
      await queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });

      // Then update UI state
      setIsEditMode(false);

      // Show success message
      toast({
        title: "Success",
        description: "Post updated successfully"
      });

      // Close the sidebar after a short delay to allow the user to see the success message
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async () => {
    try {
      await apiRequest(`/api/posts/${post!.id}`, 'DELETE');
      await queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // If we're in new/edit mode, render the form
  if ((isNew || isEditMode) && !readOnly) {
    return (
      <PreviewSidebar
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <PostForm
          onSubmit={async (data) => {
            if (isEditMode) {
              await handleUpdatePost(data);
            } else if (onSave) {
              await onSave(data);
              // Close the sidebar after successful save
              onClose();
            }
          }}
          defaultValues={post}
          isEditing={isEditMode}
        />
      </PreviewSidebar>
    );
  }

  const videoEmbedUrl = post?.videoUrl ? getVideoEmbedUrl(post.videoUrl) : null;


  return (
    <PreviewSidebar
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* Show members-only overlay for unauthorized users */}
      {post?.membersOnly && !user ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <div className="flex items-center gap-2">
            <Lock className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Members Only Content</h2>
          </div>
          <p className="text-center text-muted-foreground max-w-sm">
            This content is exclusive to our members. Sign in or create an account to access it.
          </p>
          <RouterLink href="/login">
            <Button variant="default" size="lg">
              Sign in to View
            </Button>
          </RouterLink>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto pb-16">
            <div className="space-y-6">
              {/* Title Section */}
              {post?.title && (
                <div>
                  <h2 className="text-2xl font-semibold leading-tight">{post.title}</h2>
                  {post.summary && (
                    <p className="text-base text-muted-foreground mt-2">{post.summary}</p>
                  )}

                  {/* Author and timestamp info */}
                  {post.createdAt && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span>Published by {post.creator?.displayName || 'Unknown'}</span>
                      <span>•</span>
                      <span>{timeAgo.format(new Date(post.createdAt))}</span>
                      {!readOnly && (
                        <>
                          {post?.isPinned && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary">Featured</Badge>
                            </>
                          )}
                          {post?.membersOnly && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Members Only
                              </Badge>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Featured Image Section */}
              {post?.featuredImage && (
                <div className="relative w-full aspect-video max-h-[300px] bg-muted rounded-lg overflow-hidden mt-4 group">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Right Action Menu */}
                  {canEditPost && (
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-sm"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Bottom Tags Section */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-sm"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show tags outside image only if there's no featured image */}
              {post?.tags && post.tags.length > 0 && !post?.featuredImage && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* CTA Section */}
              {post?.ctaLink && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    if (post.ctaLink) window.open(post.ctaLink, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {post.ctaLabel || 'Learn More'}
                </Button>
              )}

              {/* Video Section */}
              {videoEmbedUrl && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mt-4">
                  <iframe
                    src={videoEmbedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Rich Text Content Section */}
              {editor && (
                <div className="prose prose-lg max-w-none dark:prose-invert [&_ul]:space-y-0.5 [&_ol]:space-y-0.5 [&_li_p]:my-0 mt-4">
                  <EditorContent editor={editor} />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Section - Fixed to bottom */}
          {availablePosts.length > 1 && onNavigate && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  disabled={!hasPrevious}
                  onClick={() => handleNavigate(availablePosts[currentIndex - 1])}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={!hasNext}
                  onClick={() => handleNavigate(availablePosts[currentIndex + 1])}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post
              "{post?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeletePost}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PreviewSidebar>
  );
}

function getVideoEmbedUrl(url: string): string | null {
  try {
    const videoUrl = new URL(url);

    // YouTube
    if (videoUrl.hostname.includes('youtube.com') || videoUrl.hostname.includes('youtu.be')) {
      const videoId = videoUrl.hostname.includes('youtu.be')
        ? videoUrl.pathname.slice(1)
        : videoUrl.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    // Vimeo
    if (videoUrl.hostname.includes('vimeo.com')) {
      const videoId = videoUrl.pathname.split('/').pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}