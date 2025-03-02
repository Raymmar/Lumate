import { Post, type InsertPost } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { PostForm } from "./PostForm";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface PostPreviewProps {
  post?: Post;
  isNew?: boolean;
  onClose: () => void;
  onSave?: (data: InsertPost) => Promise<void>;
  readOnly?: boolean;
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

export function PostPreview({ post, isNew = false, onClose, onSave, readOnly = false }: PostPreviewProps) {
  console.log("PostPreview render - isNew:", isNew, "post:", post, "readOnly:", readOnly);

  const editor = useEditor({
    extensions: [StarterKit],
    content: post?.body || '',
    editable: false,
  });

  if ((isNew || !post) && !readOnly) {
    console.log("Rendering new post form");
    return (
      <PreviewSidebar 
        title="New Post"
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

  return (
    <PreviewSidebar 
      title={readOnly ? "Post" : "Post Details"}
      open={true}
      onOpenChange={(open) => {
        console.log("PreviewSidebar onOpenChange:", open);
        if (!open) onClose();
      }}
    >
      <div className="space-y-6">
        {/* Title Section */}
        {post?.title && (
          <div>
            <h3 className="text-lg font-semibold">{post.title}</h3>
            {post.summary && (
              <p className="text-sm text-muted-foreground mt-1">{post.summary}</p>
            )}
          </div>
        )}

        {/* Featured Image Section */}
        {post?.featuredImage && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Metadata Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {!readOnly && post?.isPinned && <Badge variant="secondary">Pinned</Badge>}
            {post?.createdAt && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(post.createdAt), 'PPP')}
              </span>
            )}
          </div>
        </div>

        {/* CTA Section */}
        {post?.ctaLink && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open(post.ctaLink, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {post.ctaLabel || 'Learn More'}
          </Button>
        )}

        {/* Video Section */}
        {videoEmbedUrl && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
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
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </PreviewSidebar>
  );
}