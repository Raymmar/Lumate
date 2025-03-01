import { Post, type InsertPost } from "@shared/schema";
import { PreviewSidebar } from "./PreviewSidebar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { PostForm } from "./PostForm";

interface PostPreviewProps {
  post?: Post;
  isNew?: boolean;
  onClose: () => void;
  onSave: (data: InsertPost) => Promise<void>;
}

export function PostPreview({ post, isNew = false, onClose, onSave }: PostPreviewProps) {
  if (isNew || !post) {
    return (
      <PreviewSidebar title="New Post" onClose={onClose}>
        <PostForm onSubmit={onSave} />
      </PreviewSidebar>
    );
  }

  return (
    <PreviewSidebar title="Post Details" onClose={onClose}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">{post.title}</h3>
          {post.summary && (
            <p className="text-sm text-muted-foreground mt-1">{post.summary}</p>
          )}
        </div>

        {post.featuredImage && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {post.isPinned && <Badge variant="secondary">Pinned</Badge>}
            <span className="text-sm text-muted-foreground">
              Created {format(new Date(post.createdAt), 'PPP')}
            </span>
          </div>
        </div>

        {post.ctaLink && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open(post.ctaLink, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {post.ctaLabel || 'Learn More'}
          </Button>
        )}

        {post.videoUrl && (
          <div className="aspect-video bg-muted rounded-lg">
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Video Preview
            </div>
          </div>
        )}

        <div className="prose prose-sm max-w-none dark:prose-invert">
          {post.body}
        </div>
      </div>
    </PreviewSidebar>
  );
}