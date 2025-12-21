import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, Ticket, UserPlus, ExternalLink as ExternalLinkIcon, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PublicPostsTable } from "./PublicPostsTable";
import { PostPreview } from "@/components/admin/PostPreview";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import type { Post, InsertPost } from "@shared/schema";
import { apiRequest } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { formatPostTitleForUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { MembersOnlyCard } from "./MembersOnlyCard";
import { JoinUsCard } from "@/components/JoinUsCard";
import { SocialLinks } from "@/components/ui/social-links";
import { YoutubeEmbed } from "@/components/ui/youtube-embed";
import { FeaturedMemberCard } from "@/components/people/FeaturedMemberCard";
import { SponsorGrid } from "@/components/sponsors";
import { PinnedPostsCarousel } from "@/components/news/PinnedPostsCarousel";


function LinksSection() {
  return (
    <Card className="border">
      <CardHeader className="p-3 md:p-4 pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Links</CardTitle>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-4">
        <div className="flex flex-col gap-4">
          <Link href="/about" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              About Sarasota Tech
            </Button>
          </Link>
          <Link href="/summit" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              Tech Summit
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
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: postsData } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/public/posts"],
  });

  const { toast } = useToast();

  const mostRecentMembersOnlyPost = postsData?.posts
    .filter(post => post.membersOnly)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const handleCreatePost = async (data: InsertPost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, 'PATCH', data);
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Post updated successfully"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/public/posts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [, setLocation] = useLocation();
  
  const isExternalUrl = (url: string) => {
    if (!url) return false;
    if (url.startsWith('/')) return false;
    try {
      const urlObj = new URL(url);
      return !urlObj.hostname.includes('sarasota.tech');
    } catch {
      return false;
    }
  };

  const isRelativePath = (url: string) => {
    return url.startsWith('/');
  };

  const handleSelectPost = (post: Post, isEditing = false) => {
    if (isEditing && (user?.isAdmin || post.creatorId === user?.id)) {
      setEditingPost(post);
    } else if (post.redirectUrl) {
      if (isExternalUrl(post.redirectUrl)) {
        window.open(post.redirectUrl, '_blank', 'noopener,noreferrer');
      } else if (isRelativePath(post.redirectUrl)) {
        setLocation(post.redirectUrl);
      } else {
        // Internal full URL (e.g., https://sarasota.tech/summit) - navigate via browser
        window.location.href = post.redirectUrl;
      }
    } else {
      const slug = formatPostTitleForUrl(post.title, post.id.toString());
      setLocation(`/post/${slug}`);
    }
  };

  return (
    <div className="space-y-4 !border-none">
      <PinnedPostsCarousel onSelect={handleSelectPost} />
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <LinksSection />
        {user && mostRecentMembersOnlyPost ? (
          <MembersOnlyCard post={mostRecentMembersOnlyPost} onSelect={handleSelectPost} />
        ) : (
          <JoinUsCard />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
          description="68% open rate 23% click rate"
        />
      </div>

      {/* Video and Featured Member section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <YoutubeEmbed videoId="JMy4CmxWMlE" title="Raymmar YouTube Video" />
        </div>
        <div>
          <FeaturedMemberCard />
        </div>
      </div>

      {/* Posts Section */}
      <PublicPostsTable
        onSelect={handleSelectPost}
        onCreatePost={() => setIsCreating(true)}
      />

      {/* Sponsor Grid - Shows 2026 sponsors through 2026, then current year after */}
      <SponsorGrid 
        year={new Date().getFullYear() <= 2026 ? 2026 : new Date().getFullYear()}
        title="Our Sponsors"
        showBecomeSponsorCTA={true}
      />

      {/* Create Post Modal */}
      <PostModal 
        open={isCreating} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsSubmitting(false);
          }
        }}
        title="Create New Post"
        mode="create"
        onSubmit={() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
      >
        <PostForm 
          onSubmit={handleCreatePost}
          isEditing={false}
        />
      </PostModal>

      {/* Edit Post Modal */}
      <PostModal 
        open={!!editingPost} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingPost(null);
            setIsSubmitting(false);
          }
        }}
        title="Edit Post"
        mode="edit"
        onSubmit={() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
      >
        {editingPost && (
          <PostForm 
            onSubmit={handleUpdatePost}
            defaultValues={{
              title: editingPost.title,
              summary: editingPost.summary || "",
              body: editingPost.body || "",
              featuredImage: editingPost.featuredImage || "",
              videoUrl: editingPost.videoUrl || "",
              ctaLink: editingPost.ctaLink || "",
              ctaLabel: editingPost.ctaLabel || "",
              redirectUrl: editingPost.redirectUrl || "",
              isPinned: editingPost.isPinned,
              membersOnly: editingPost.membersOnly,
              tags: editingPost.tags || []
            }}
            isEditing={true}
          />
        )}
      </PostModal>

    </div>
  );
}