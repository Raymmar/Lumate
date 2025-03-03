import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, ChevronLeft, ChevronRight, Ticket, UserPlus, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PublicPostsTable } from "./PublicPostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import type { Post, InsertPost } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";

// PinnedPostsCarousel component updates
function PinnedPostsCarousel({ onSelect }: { onSelect: (post: Post) => void }) {
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const pinnedPosts = postsData?.posts.filter(post => post.isPinned).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || [];

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
      <Card className="border relative overflow-hidden h-[300px] group">
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
    <Card className="border relative overflow-hidden h-[300px] group">
      {/* Background image */}
      <img
        src={backgroundImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-in-out"
        style={{ transform: 'scale(1.02)' }}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      {pinnedPosts.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((current) =>
                current === 0 ? pinnedPosts.length - 1 : current - 1
              );
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-30"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <CardContent
        className="relative h-full flex flex-col justify-end p-6 text-white cursor-pointer z-10"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelect(currentPost);
          }
        }}
      >
        <h3 className="text-2xl font-bold mb-2">{currentPost.title}</h3>
        {currentPost.summary && (
          <p className="text-white/90 mb-4 line-clamp-2">
            {currentPost.summary}
          </p>
        )}
        <Button
          className="w-fit bg-white text-black hover:bg-white/90 transition-colors"
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

function LinksSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Links</CardTitle>
          <div className="flex gap-2">
            <a href="https://instagram.com/sarasota.tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiInstagram className="h-4 w-4" />
            </a>
            <a href="https://twitter.com/sarasota_tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiX className="h-4 w-4" />
            </a>
            <a href="https://youtube.com/@sarasota.tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiYoutube className="h-4 w-4" />
            </a>
            <a href="https://linkedin.com/company/sarasota-tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
              <SiLinkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Link href="/about" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              About Sarasota Tech
            </Button>
          </Link>
          <a href="https://lu.ma/sarasota.tech" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Event Calendar
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
          <a href="https://github.com/sarasota-tech/resources" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Resources
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
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
    queryKey: ["/api/public/stats"],
    queryFn: async () => {
      const response = await fetch("/api/public/stats");
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
    <div className="space-y-4 bg-card">
      <div className="grid gap-4 grid-cols-2">
        <LinksSection />
        <JoinUsSection />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="Events"
          value={statsData?.events || 0}
          icon={Calendar}
          isLoading={isLoading}
          description="Since August 2023"
        />
        <StatCard
          title="Tickets"
          value={statsData?.totalAttendees || 0}
          icon={Ticket}
          isLoading={isLoading}
          description="Total event attendance"
        />
        <StatCard
          title="Subscribers"
          value={statsData?.uniqueAttendees || 0}
          icon={UserPlus}
          isLoading={isLoading}
          description="63% open rate 21% click rate"
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