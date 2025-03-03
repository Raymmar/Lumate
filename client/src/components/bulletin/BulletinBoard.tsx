import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PublicPostsTable } from "./PublicPostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import type { Post, InsertPost } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";

// PinnedPostsCarousel component updates
function PinnedPostsCarousel({ onSelect }: { onSelect: (post: Post) => void }) {
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const pinnedPosts = postsData?.posts.filter(post => post.isPinned).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || [];

  const [api, setApi] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!api || pinnedPosts.length <= 1) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 10000);

    return () => clearInterval(interval);
  }, [api, pinnedPosts.length]);

  // Update current index when slide changes
  useEffect(() => {
    if (!api) return;

    api.on('select', () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  if (isLoading) {
    return (
      <Card className="border relative overflow-hidden h-[300px] group">
        <div className="absolute inset-0 bg-muted animate-pulse" />
      </Card>
    );
  }

  if (!pinnedPosts.length) {
    return null;
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1596443686812-2f45229eebc3?q=80&w=2070&auto=format&fit=crop';

  return (
    <Carousel
      className="w-full relative"
      opts={{
        align: 'start',
        loop: true,
        skipSnaps: false,
        duration: 500, // 500ms transition
      }}
      setApi={setApi}
    >
      <CarouselContent>
        {pinnedPosts.map((post, index) => (
          <CarouselItem key={post.id}>
            <Card className="border relative overflow-hidden h-[300px] group cursor-pointer" onClick={() => onSelect(post)}>
              <div className="absolute inset-0">
                <img
                  src={post.featuredImage || fallbackImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scale(1.02)' }}
                  onLoad={() => setImageLoaded(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
              </div>

              {!imageLoaded && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}

              <CardContent className="relative h-full flex flex-col justify-end p-6 text-white z-10">
                <h3 className="text-2xl font-bold mb-2">{post.title}</h3>
                {post.summary && (
                  <p className="text-white/90 mb-4 line-clamp-2">
                    {post.summary}
                  </p>
                )}
                <Button
                  className="w-fit bg-white text-black hover:bg-white/90 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(post);
                  }}
                >
                  Read More
                </Button>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>

      {pinnedPosts.length > 1 && (
        <>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {pinnedPosts.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  api?.scrollTo(idx);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}

function LinksSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Links</CardTitle>
          <div className="flex gap-2">
            <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiInstagram className="h-4 w-4" />
            </a>
            <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiX className="h-4 w-4" />
            </a>
            <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiYoutube className="h-4 w-4" />
            </a>
            <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiLinkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Community Guidelines
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Event Calendar
          </Button>
          <Button variant="outline" className="w-full justify-start font-normal hover:bg-muted">
            Resources
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JoinUsSection() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch featured event
  const { data: featuredEvent, isLoading: isEventLoading } = useQuery({
    queryKey: ["/api/events/featured"],
    queryFn: async () => {
      const response = await fetch("/api/events/featured");
      if (!response.ok) {
        throw new Error("Failed to fetch featured event");
      }
      return response.json();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/events/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          event_api_id: featuredEvent?.api_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send invite');
      }

      toast({
        title: "Success!",
        description: "Please check your email for the invitation.",
      });

      // Set submitted state to true
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        {isSubmitted ? (
          <CardTitle>Welcome to Sarasota Tech</CardTitle>
        ) : (
          <>
            <CardTitle>Sarasota.Tech</CardTitle>
            <p className="text-muted-foreground mt-1">
              Connecting Sarasota's tech community and driving the city forward.
            </p>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thanks for joining! We've sent an invite to your email for our next event.
              Once you receive it, you can claim your profile to track your attendance and
              stay connected with the community.
            </p>
            <p className="text-sm text-muted-foreground">
              Be sure to check your inbox (or spam folder) for the invitation email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email"
                type="email"
                className="flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isEventLoading || !featuredEvent}
              />
              <Button
                className="bg-primary hover:bg-primary/90"
                type="submit"
                disabled={isLoading || isEventLoading || !featuredEvent}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Join"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isEventLoading ? (
                "Loading event details..."
              ) : !featuredEvent ? (
                "No upcoming events available at the moment."
              ) : (
                "Drop your email for an invite to our next event and start networking with the region's top tech professionals."
              )}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function SponsorsSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Sponsors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-muted/50 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground"
            >
              Sponsor {i}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


export function BulletinBoard() {
  const queryClient = useQueryClient();
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    }
  });

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { data: postsData } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const { toast } = useToast();

  const handleCreatePost = async (data: InsertPost) => {
    try {
      await apiRequest('/api/admin/posts', 'POST', data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <LinksSection />
        <JoinUsSection />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="Total Events"
          value={statsData?.events || 0}
          icon={Calendar}
          isLoading={isLoading}
          description="Total number of events hosted"
        />
        <StatCard
          title="Total Attendees"
          value={statsData?.totalAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="Total event attendance count"
        />
        <StatCard
          title="Unique Attendees"
          value={statsData?.uniqueAttendees || 0}
          icon={Users}
          isLoading={isLoading}
          description="Individual event attendees"
        />
      </div>

      {/* Pinned Posts Carousel */}
      <PinnedPostsCarousel onSelect={setSelectedPost} />

      {/* Latest Posts Section */}
      <PublicPostsTable
        onSelect={setSelectedPost}
        onCreatePost={() => setIsCreating(true)}
      />

      {/* Post Preview/Creation Modal */}
      {(selectedPost || isCreating) && (
        <PostPreview
          post={selectedPost || undefined}
          isNew={isCreating}
          onClose={() => {
            setSelectedPost(null);
            setIsCreating(false);
          }}
          onSave={handleCreatePost}
          posts={postsData?.posts || []}
          onNavigate={setSelectedPost}
        />
      )}

      <SponsorsSection />
    </div>
  );
}