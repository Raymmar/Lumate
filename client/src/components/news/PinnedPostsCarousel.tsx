import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});

  // Preload all images to ensure they're available when switching slides
  useEffect(() => {
    if (!pinnedPosts.length) return;
    
    pinnedPosts.forEach((post, index) => {
      if (!post.featuredImage) return;
      
      const img = new Image();
      img.onload = () => {
        setImagesLoaded(prev => ({ ...prev, [index]: true }));
      };
      img.src = post.featuredImage;
    });
  }, [pinnedPosts]);

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
    <Card 
      className="border relative overflow-hidden h-[360px] group cursor-pointer"
      onClick={() => onSelect(currentPost)}
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0 bg-muted">
        <img 
          src={backgroundImage}
          alt={currentPost.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            // If image fails to load, fall back to a default image
            const target = e.target as HTMLImageElement;
            target.src = fallbackImage;
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      
      {/* Post content */}
      <CardContent className="relative h-full flex flex-col justify-end p-6 text-white z-10">
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