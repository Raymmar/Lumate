import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, ChevronLeft, ChevronRight, Ticket, UserPlus, ExternalLink as ExternalLinkIcon, Lock } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PublicPostsTable } from "./PublicPostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import type { Post, InsertPost } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { MembersOnlyCard } from "./MembersOnlyCard";
import { JoinUsCard } from "@/components/JoinUsCard";
import { SocialLinks } from "@/components/ui/social-links";
import { YoutubeEmbed } from "@/components/ui/youtube-embed";
import { FeaturedMembersList } from "@/components/people/FeaturedMembersList";

function PinnedPostsCarousel({ onSelect }: { onSelect: (post: Post) => void }) {
  const { data: postsData, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });
  const { user } = useAuth();

  const pinnedPosts = postsData?.posts
    .filter(post => post.isPinned && (!post.membersOnly || user))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

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

function LinksSection() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Links</CardTitle>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <Link href="/about" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              About Sarasota Tech
            </Button>
          </Link>
          <a href="https://lu.ma/SarasotaTech" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Event Calendar
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
          <a href="https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Get More Involved
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
          <a href="https://raymmar.notion.site/ST-Media-Kit-1277f5136ac18006aa35c8ccf66ac43a" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Media Kit
              <ExternalLinkIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function BulletinBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
  const [isEditing, setIsEditing] = useState(false);
  const { data: postsData } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const { toast } = useToast();

  const mostRecentMembersOnlyPost = postsData?.posts
    .filter(post => post.membersOnly)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

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

  const handleSelectPost = (post: Post, isEditing = false) => {
    setSelectedPost(post);
    setIsEditing(isEditing);
  };

  return (
    <div className="space-y-4 !border-none">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <LinksSection />
        {user && mostRecentMembersOnlyPost ? (
          <MembersOnlyCard post={mostRecentMembersOnlyPost} onSelect={handleSelectPost} />
        ) : (
          <JoinUsCard />
        )}
      </div>

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

      {/* Video and Featured Members section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <YoutubeEmbed videoId="JMy4CmxWMlE" title="Raymmar YouTube Video" />
        </div>
        <div className="md:col-span-1">
          <FeaturedMembersList />
        </div>
      </div>

      <PinnedPostsCarousel onSelect={handleSelectPost} />

      {/* Posts Section */}
      <PublicPostsTable
        onSelect={handleSelectPost}
        onCreatePost={() => setIsCreating(true)}
      />

      {(selectedPost || isCreating) && (
        <PostPreview
          post={selectedPost || undefined}
          isNew={isCreating}
          isEditing={isEditing}
          onClose={() => {
            setSelectedPost(null);
            setIsCreating(false);
            setIsEditing(false);
          }}
          onSave={handleCreatePost}
          posts={postsData?.posts || []}
          onNavigate={post => handleSelectPost(post)}
        />
      )}

    </div>
  );
}