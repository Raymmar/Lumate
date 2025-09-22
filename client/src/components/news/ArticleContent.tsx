import { Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Link as RouterLink } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface ArticleContentProps {
  post?: Post;
  posts?: Post[];
  onNavigate?: (post: Post) => void;
  showNavigation?: boolean;
  showMembersOnlyOverlay?: boolean;
}

export function ArticleContent({
  post,
  posts = [],
  onNavigate,
  showNavigation = false,
  showMembersOnlyOverlay = true
}: ArticleContentProps) {
  const { user } = useAuth();

  // Filter out members-only posts from navigation if user is not authenticated
  const availablePosts = posts.filter(p => !p.membersOnly || user);
  const currentIndex = availablePosts.findIndex(p => p.id === post?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < availablePosts.length - 1;

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

  const handleNavigate = async (nextPost: Post) => {
    try {
      // Check if post is members-only
      if (nextPost.membersOnly && !user) {
        return;
      }

      if (editor) {
        editor.commands.clearContent();
      }
      onNavigate?.(nextPost);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const videoEmbedUrl = post?.videoUrl ? getVideoEmbedUrl(post.videoUrl) : null;

  // Show members-only overlay for unauthorized users
  if (showMembersOnlyOverlay && post?.membersOnly && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="flex items-center gap-2">
          <Lock className="w-8 h-8" />
          <h2 className="text-xl font-semibold">Members Only Content</h2>
        </div>
        <p className="text-center text-muted-foreground max-w-sm">
          This content is exclusive to our members. Sign in or create an account to access it.
        </p>
        <RouterLink href="/login">
          <Button variant="default" size="lg" data-testid="button-sign-in">
            Sign in to View
          </Button>
        </RouterLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Title Section */}
          {post?.title && (
            <div>
              <h1 className="text-3xl font-bold leading-tight" data-testid="text-article-title">
                {post.title}
              </h1>
              {post.summary && (
                <p className="text-lg text-muted-foreground mt-3" data-testid="text-article-summary">
                  {post.summary}
                </p>
              )}

              {/* Author and timestamp info */}
              {post.createdAt && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <span data-testid="text-article-author">
                    Published by {post.creator?.displayName || 'Unknown'}
                  </span>
                  <span>•</span>
                  <span data-testid="text-article-date">
                    {timeAgo.format(new Date(post.createdAt))}
                  </span>
                  {post?.isPinned && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" data-testid="badge-featured">Featured</Badge>
                    </>
                  )}
                  {post?.membersOnly && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-members-only">
                        <Lock className="w-3 h-3" />
                        Members Only
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Featured Image Section */}
          {post?.featuredImage && (
            <div className="relative w-full aspect-video max-h-[400px] bg-muted rounded-lg overflow-hidden mt-6">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
                data-testid="img-featured-image"
              />

              {/* Bottom Tags Section */}
              {post.tags && post.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-sm"
                        data-testid={`badge-tag-${tag}`}
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
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-tag-${tag}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* CTA Section */}
          {post?.ctaLink && (
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => {
                if (post.ctaLink) window.open(post.ctaLink, '_blank');
              }}
              data-testid="button-cta"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {post.ctaLabel || 'Learn More'}
            </Button>
          )}

          {/* Video Section */}
          {videoEmbedUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mt-6">
              <iframe
                src={videoEmbedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                data-testid="iframe-video"
              />
            </div>
          )}

          {/* Rich Text Content Section */}
          {editor && (
            <div className="prose prose-lg max-w-none dark:prose-invert [&_ul]:space-y-0.5 [&_ol]:space-y-0.5 [&_li_p]:my-0 mt-6" data-testid="content-article-body">
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Section - Only show if enabled */}
      {showNavigation && availablePosts.length > 1 && onNavigate && (
        <div className="border-t bg-background p-4 mt-8">
          <div className="flex justify-between items-center max-w-full">
            <Button
              variant="ghost"
              disabled={!hasPrevious}
              onClick={() => handleNavigate(availablePosts[currentIndex - 1])}
              className="min-w-[100px] h-10"
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={!hasNext}
              onClick={() => handleNavigate(availablePosts[currentIndex + 1])}
              className="min-w-[100px] h-10"
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
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