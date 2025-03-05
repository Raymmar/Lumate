import { Post, type InsertPost } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { PostForm } from "./PostForm";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { format } from "date-fns";

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface PostPreviewProps {
  post?: Post;
  isNew?: boolean;
  onClose: () => void;
  onSave?: (data: InsertPost) => Promise<void>;
  readOnly?: boolean;
  posts?: Post[];
  onNavigate?: (post: Post) => void;
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

export function PostPreview({
  post,
  isNew = false,
  onClose,
  onSave,
  readOnly = false,
  posts = [],
  onNavigate
}: PostPreviewProps) {
  console.log("PostPreview render - isNew:", isNew, "post:", post, "readOnly:", readOnly);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
  });

  // Update editor content when post changes
  useEffect(() => {
    if (editor && post?.body !== undefined) {
      // First clear the content
      editor.commands.clearContent();

      // Then set the new content if it exists
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

  if ((isNew || !post) && !readOnly) {
    console.log("Rendering new post form");
    return (
      <PreviewSidebar
        open={true}
        onOpenChange={(open) => {
          console.log("PreviewSidebar onOpenChange:", open);
          if (!open) onClose();
        }}
      >
        <PostForm onSubmit={onSave!} />
      </PreviewSidebar>
    );
  }

  const videoEmbedUrl = post?.videoUrl ? getVideoEmbedUrl(post.videoUrl) : null;

  // Find current post index and determine if we have prev/next
  const currentIndex = posts.findIndex(p => p.id === post?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < posts.length - 1;

  const handleNavigate = (nextPost: Post) => {
    if (editor) {
      // Clear content before navigation
      editor.commands.clearContent();
    }
    onNavigate?.(nextPost);
  };

  return (
    <PreviewSidebar
      open={true}
      onOpenChange={(open) => {
        console.log("PreviewSidebar onOpenChange:", open);
        if (!open) onClose();
      }}
    >
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
                    <span>Published by {post.creator?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{timeAgo.format(new Date(post.createdAt))}</span>
                    {!readOnly && post?.isPinned && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary">Featured</Badge>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Featured Image Section */}
            {post?.featuredImage && (
              <div className="relative w-full aspect-video max-h-[300px] bg-muted rounded-lg overflow-hidden mt-4">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Tags Section */}
            {post?.tags && post.tags.length > 0 && (
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
        {posts.length > 1 && onNavigate && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                disabled={!hasPrevious}
                onClick={() => handleNavigate(posts[currentIndex - 1])}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={!hasNext}
                onClick={() => handleNavigate(posts[currentIndex + 1])}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PreviewSidebar>
  );
}