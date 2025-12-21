import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Lock, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Post } from "@shared/schema";

interface PinnedPostsCarouselProps {
  onSelect: (post: Post) => void;
}

export function PinnedPostsCarousel({ onSelect }: PinnedPostsCarouselProps) {
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });
  const { user } = useAuth();

  const pinnedPosts = postsData?.posts
    .filter(post => post.isPinned && (!post.membersOnly || user))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  const isExternalUrl = (url: string | null | undefined) => {
    if (!url) return false;
    if (url.startsWith('/')) return false;
    try {
      const urlObj = new URL(url);
      return !urlObj.hostname.includes('sarasota.tech');
    } catch {
      return false;
    }
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (pinnedPosts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % pinnedPosts.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [pinnedPosts.length]);

  if (isLoading) {
    return (
      <Card className="border relative overflow-hidden h-[360px] group">
        <div className="absolute inset-0 bg-muted animate-pulse" />
      </Card>
    );
  }

  if (!pinnedPosts.length) {
    return null;
  }

  const currentPost = pinnedPosts[currentIndex];
  const fallbackImage = 'https://images.unsplash.com/photo-1596443686812-2f45229eebc3?q=80&w=2070&auto=format&fit=crop';
  const backgroundImage = currentPost.featuredImage || fallbackImage;

  return (
    <Card className="relative overflow-hidden h-[360px] group cursor-pointer" onClick={() => onSelect(currentPost)}>
      <img
        src={backgroundImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setImageLoaded(true)}
      />

      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute top-6 right-6 flex flex-wrap gap-2 z-20">
        {currentPost.membersOnly && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Members Only
          </Badge>
        )}
        {isExternalUrl(currentPost.redirectUrl) && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            External Link
          </Badge>
        )}
        {currentPost.tags && currentPost.tags.map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-xs text-white border-white/40 hover:bg-white/10">
            {tag}
          </Badge>
        ))}
      </div>

      {pinnedPosts.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((current) =>
                current === 0 ? pinnedPosts.length - 1 : current - 1
              );
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-foreground p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((current) =>
                (current + 1) % pinnedPosts.length
              );
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/20 hover:bg-background/40 text-foreground p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <CardContent className="relative h-full flex flex-col justify-end p-3 md:p-4 text-white z-10">
        <h3 className="text-2xl font-bold mb-2">{currentPost.title}</h3>
        {currentPost.summary && (
          <p className="text-white/90 mb-4 line-clamp-2">
            {currentPost.summary}
          </p>
        )}
        <Button
          variant="secondary"
          className="w-fit"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(currentPost);
          }}
        >
          Read More
        </Button>

        {pinnedPosts.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {pinnedPosts.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}