import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface YoutubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
}

export function YoutubeEmbed({ videoId, title = "YouTube video", className = "" }: YoutubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract video ID from URL if a full URL is provided
  const getVideoId = (idOrUrl: string) => {
    if (idOrUrl.length === 11) return idOrUrl; // Already a video ID

    try {
      const url = new URL(idOrUrl);
      
      if (url.hostname === 'youtu.be') {
        return url.pathname.slice(1); // Format: youtu.be/VIDEO_ID
      }
      
      if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
        const params = new URLSearchParams(url.search);
        return params.get('v') || ''; // Format: youtube.com/watch?v=VIDEO_ID
      }
      
      return idOrUrl; // Fallback to original input
    } catch (e) {
      return idOrUrl; // Not a URL, assume it's already a video ID
    }
  };

  const embedId = getVideoId(videoId);

  useEffect(() => {
    // Reset loading state when video ID changes
    setIsLoading(true);
    setError(null);
  }, [videoId]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("Failed to load video. Please check the video ID.");
  };

  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardContent className="p-0 relative" style={{ paddingTop: "56.25%" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Skeleton className="w-full h-full absolute inset-0" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive p-4 text-center">
            {error}
          </div>
        )}
        
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${embedId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </CardContent>
    </Card>
  );
}