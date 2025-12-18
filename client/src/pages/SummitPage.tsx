import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Post } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPostTitleForUrl } from "@/lib/utils";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PostModal } from "@/components/admin/PostModal";
import { PostForm } from "@/components/admin/PostForm";
import type { InsertPost } from "@shared/schema";
import { PublicPostsTable } from "@/components/bulletin/PublicPostsTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PUBLIC_POSTS_QUERY_KEY } from "@/components/bulletin/PublicPostsTable";
import { SEO } from "@/components/ui/seo";
import { SponsorGrid } from "@/components/sponsors";
import { generateSponsorInquiryEmail } from "@/lib/sponsorUtils";
import { AgendaSection } from "@/components/agenda";

// Initialize TimeAgo
TimeAgo.addLocale(en);
const timeAgo = new TimeAgo("en-US");

function EventLinksCard() {
  return (
    <Card className="border w-full max-w-full overflow-hidden">
      <CardHeader className="p-3 md:p-4 pb-3">
        <CardTitle>Event Links</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-4">
        <div className="flex flex-col gap-3">
          <a
            href="https://drive.google.com/file/d/1gcsQov4eRW_-GL25k1e7AypxU6qpxIWz/view?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
            >
              <span className="flex items-center gap-2">Sponsor Overview</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a href={generateSponsorInquiryEmail()} className="block">
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
              data-testid="button-become-sponsor-event-links"
            >
              <span className="flex items-center gap-2">Become a Sponsor</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a
            href="https://airtable.com/applDXoTdj4LPUUVc/shrzIM9RcYBek4C0k"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
            >
              <span className="flex items-center gap-2">Apply to Speak</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a
            href="https://airtable.com/applDXoTdj4LPUUVc/shrnlKIwiBZbQALP3"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
            >
              <span className="flex items-center gap-2">Host an Event</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a
            href="https://airtable.com/applDXoTdj4LPUUVc/shr31QX5QxxBUFrQM"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
            >
              <span className="flex items-center gap-2">Volunteer</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="outline"
            className="w-full justify-between font-normal hover:bg-muted"
            asChild
          >
            <Link href="/summit2025">2025 Summit Archive</Link>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between font-normal hover:bg-muted"
            asChild
          >
            <Link href="/about">About Sarasota Tech</Link>
          </Button>

          {/* YouTube Video Embed */}
          <div className="mt-4 w-full max-w-full">
            <div
              className="relative w-full max-w-full overflow-hidden"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src="https://www.youtube.com/embed/z2wyOGwpUHg"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                data-testid="video-youtube-embed"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SponsorCardProps {
  sponsor: {
    name: string;
    logo: string;
    description: string;
    category?: string;
    url?: string;
  };
}

function SponsorCard({ sponsor }: SponsorCardProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <img
          src={sponsor.logo}
          alt={sponsor.name}
          className="w-full h-auto object-contain rounded-lg"
        />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-sm">{sponsor.name}</h3>
      </div>
    </div>
  );
}

function SummitNewsSection() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePostClick = (post: Post, isEditing = false) => {
    if (isEditing) {
      setEditingPost(post);
    } else {
      const slug = formatPostTitleForUrl(post.title, post.id.toString());
      setLocation(`/post/${slug}`);
    }
  };

  const handleCreatePost = async (data: InsertPost & { tags?: string[] }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const createdPost = (await apiRequest(
        "/api/admin/posts",
        "POST",
        data,
      )) as Post;

      // Optimistically update the cache with the new post
      queryClient.setQueryData(
        PUBLIC_POSTS_QUERY_KEY,
        (old: { posts: Post[] } | undefined) => {
          if (!old) return old;

          // Create an optimistic post object
          const optimisticPost: Post = {
            id: createdPost.id || Date.now(), // Use server ID or temporary ID
            title: data.title,
            summary: data.summary || null,
            body: data.body,
            featuredImage: data.featuredImage || null,
            videoUrl: data.videoUrl || null,
            ctaLink: data.ctaLink || null,
            ctaLabel: data.ctaLabel || null,
            isPinned: data.isPinned || false,
            membersOnly: data.membersOnly || false,
            creatorId: user?.id || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            creator: user
              ? {
                  id: user.id,
                  displayName: user.displayName || "Unknown",
                }
              : undefined,
            tags: data.tags || [],
          };

          return {
            posts: [optimisticPost, ...old.posts],
          };
        },
      );

      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully",
      });

      // Invalidate to fetch the real data from the server
      await queryClient.invalidateQueries({ queryKey: PUBLIC_POSTS_QUERY_KEY });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (data: InsertPost) => {
    if (!editingPost || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/posts/${editingPost.id}`, "PATCH", data);
      setEditingPost(null);
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-90vw">
        <PublicPostsTable
          onSelect={handlePostClick}
          onCreatePost={() => setIsCreating(true)}
          filterTags={["2026 summit", "summit 2026"]}
          title="2026 Summit News"
          maxPosts={50}
        />
      </div>

      {/* Create Post Modal */}
      <PostModal
        open={isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setIsSubmitting(false);
          }
        }}
        title="Create New Summit Post"
        mode="create"
        onSubmit={() => {
          const form = document.querySelector("form");
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
      >
        <PostForm
          onSubmit={handleCreatePost}
          defaultValues={{ tags: ["summit 2026"] }}
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
        title="Edit Summit Post"
        mode="edit"
        onSubmit={() => {
          const form = document.querySelector("form");
          if (form) {
            form.requestSubmit();
          }
        }}
        isSubmitting={isSubmitting}
      >
        <PostForm
          onSubmit={handleUpdatePost}
          defaultValues={editingPost || undefined}
          isEditing={true}
        />
      </PostModal>
    </>
  );
}

function ImageGalleryCard() {
  const galleryImages = [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png",
      alt: "Sarasota Tech Summit 2025",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1761426785264-Friends---Family-1.png",
      alt: "Event highlights",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1761426777313-Friends---Family.png",
      alt: "Sponsors",
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png",
      alt: "Event graphics",
    },
  ];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <Card className="border pt-3 md:pt-4 w-full max-w-full overflow-hidden">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-2 gap-3">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg cursor-pointer group aspect-video"
                onClick={() => setSelectedImage(image.src)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">View</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-screen-lg max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-h-[90vh] max-w-full object-contain"
            />
            <button
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function SummitPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const vcSponsors = [
    {
      name: "Truist Foundation",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/67327c7631db707c11c708cf_1icejcbpd-8VNNJZRB.webp",
      description:
        "Truist's purpose is to inspire and build better lives and communities.",
      category: "Finance",
      url: "https://www.sarasota.tech/entities/truist-foundation",
    },
    {
      name: "EDC of Sarasota County",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65cd141854050092684729e6_1hmkhcvr3-CZZEY10D.webp",
      description:
        "The EDC works to grow, diversify and sustain the economy of Sarasota County.",
      category: "Professional Services",
      url: "https://www.sarasota.tech/entities/sarasota-edc",
    },
  ];

  const startupSponsors = [
    {
      name: "ROBRADY",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65fb0982b27fdcf74e7f4a4f_1hpe9q1is-CGNXH684.webp",
      description:
        "ROBRADY design is a full-service, multi-disciplined product design and development studio.",
      category: "Technology",
      url: "https://www.sarasota.tech/entities/robrady",
    },
    {
      name: "RevContent",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b318431e4c0210021f821_281762150_3940173906208184_4235986378783041098_n.jpg",
      description:
        "RevContent connects advertisers to highly engaged audiences on the web's leading publisher sites.",
      category: "Technology",
      url: "https://www.sarasota.tech/entities/revcontent",
    },
    {
      name: "lab SRQ",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/674faa1452273d5c064600af_1ie7j0mp0-M2JWEPRT.webp",
      description:
        "Whether you're looking to work on your own or collaborate with others, this space is for anyone ready to get their grind on.",
      category: "Coworking",
      url: "https://www.sarasota.tech/entities/lab-srq",
    },
  ];

  const advisorySponsors = [
    {
      name: "SCF Center for Advanced Technology and Innovation",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677d469885576e2f6410432b_1ih0lnd76-2WP2JX8W.webp",
      description: "Advancing education and innovation in technology.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/scf-center-for-advanced-technology-and-innovation",
    },
    {
      name: "Suncoast Science Center/Faulhaber Fab Lab",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677b768a14094b95e1f1a6e6_327319518_480901650901561_1132036045765432866_n.png",
      description:
        "Fostering STEM education and innovation through hands-on learning.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/suncoast-science-center-faulhaber-fab-lab",
    },
    {
      name: "USF Muma College of Business",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b55d2bf9d5cdf9fadc0ec_1ieuceb3b-631TKYGH.png",
      description: "Preparing students for success in business and technology.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/usf-muma-college-of-business-sarasota-manatee",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <SEO
        title="Sarasota Tech Summit"
        description="Florida's premier tech event"
        image="https://file-upload.replit.app/api/storage/images%2F1761584634963-Thumbnail-Main.png"
      />
      {/* Gradient Sunburst Background - centered on top right corner */}
      <div
        className="fixed top-0 right-0 pointer-events-none z-0 overflow-hidden"
        style={{ transform: "translate(50%, -50%)" }}
      >
        <img
          src="https://file-upload.replit.app/api/storage/images%2F1761418188502-gradient-sunburst.png"
          alt=""
          className="w-auto h-auto opacity-80 max-w-none"
        />
      </div>

      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <PageContainer className="max-w-[1440px]">
          <NavBar />
        </PageContainer>
      </div>

      {/* Split Hero Section */}
      <div className="w-full">
        <div
          className="grid lg:grid-cols-2 min-h-[50vh] lg:min-h-[600px]"
          style={{ minHeight: "max(50vh, 500px)" }}
        >
          {/* Left Side - Full Background Image */}
          <div
            className="relative min-h-[50vh] lg:min-h-[70vh]"
            style={{ minHeight: "max(50vh, 500px)" }}
          >
            <img
              src="https://file-upload.replit.app/api/storage/images%2F1742359287380-STS_Jan'25-109%20compressed.jpeg"
              alt="Startup Sarasota"
              className="absolute inset-0 w-full h-full object-cover rounded-r-lg"
            />
            {/* STS Logo Overlay */}
            <img
              src="https://file-upload.replit.app/api/storage/images%2F1761418772061-Logo-block-white.png"
              alt="STS Logo"
              className="absolute top-5 left-5 w-48 sm:w-64 md:w-80 lg:w-96 h-auto max-w-[calc(100%-2.5rem)]"
            />
            {/* Mote Date Block - Bottom Right */}
            <img
              src="https://file-upload.replit.app/api/storage/images%2F1761418176546-Mote---Date-block.png"
              alt="Event Date"
              className="absolute w-full max-w-full md:w-96 lg:w-128 h-auto"
              style={{ bottom: "-4%", right: "0%" }}
            />
          </div>

          {/* Right Side - Event Information */}
          <div className="bg-background flex items-center p-8 lg:p-12">
            <div className="w-full max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                STARTUP SARASOTA
              </h1>

              <p className="text-xl md:text-2xl font-semibold mb-4 text-foreground">
                Tech Summit & Startup Fair
              </p>

              <div className="space-y-3 mb-8 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <span className="text-lg">January 15th, 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  <a
                    href="https://maps.app.goo.gl/mu5JzP3rRPvrDzAV9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg underline"
                  >
                    MOTE SEA
                  </a>
                </div>
              </div>

              <p className="text-lg text-muted-foreground mb-8">
                Join us for the second annual Sarasota Tech Summit featuring a
                startup school, investor panels, networking opportunities, and
                insights into how we're building the future of Sarasota's tech
                ecosystem.
              </p>

              <div>
                <a
                  href="https://luma.com/sts26"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="text-base w-full sm:w-auto sm:min-w-[300px] px-12"
                  >
                    Get Tickets
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>

              <p className="text-md text-muted-foreground mt-6">
                Presented by{" "}
                <a
                  href="https://www.rework.capital/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rework Capital
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agenda Content Blocks */}
      <div className="flex-1">
        <PageContainer className="max-w-7xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Startup Fair */}
            <Card
              className="h-full hover:shadow-lg transition-shadow w-full max-w-full"
              data-testid="card-startup-fair"
            >
              <CardContent className="p-3 md:p-4 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  Startup School
                </h3>
                <p className="text-m text-muted-foreground flex-grow">
                  Experts in venture capital, software development, branding,
                  business formation, intellectual property rights, accounting,
                  finance + more will be on site running small group breakouts
                  and interactive workshops.
                </p>
              </CardContent>
            </Card>

            {/* Main Stage */}
            <Card
              className="h-full hover:shadow-lg transition-shadow w-full max-w-full"
              data-testid="card-main-stage"
            >
              <CardContent className="p-3 md:p-4 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  Main Stage
                </h3>
                <p className="text-m text-muted-foreground flex-grow">
                  Hear from local & regional business leaders about succeeding
                  in a smaller market, reaching beyond the borders of our metro
                  area and how to build a global scale business from right here
                  in Sarasota.
                </p>
              </CardContent>
            </Card>

            {/* Keynote & Panels */}
            <Card
              className="h-full hover:shadow-lg transition-shadow w-full max-w-full"
              data-testid="card-keynote-panels"
            >
              <CardContent className="p-3 md:p-4 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  Networking & Afterparty
                </h3>
                <p className="text-m text-muted-foreground flex-grow">
                  Tech Summit is about building meaningful connections and
                  pushing the city forward. Join us for a night of world class
                  networking with the regions top thinkers in tech, finance,
                  business and more.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Event Agenda Section */}
          <div className="mb-12">
            <AgendaSection isAdmin={isAdmin} />
          </div>

          <div className="space-y-6">
            {/* Sidebar and Main Content */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left Sidebar - Event Links */}
              <div className="lg:col-span-1 space-y-4">
                <EventLinksCard />
              </div>

              {/* Right Content - News Feed and Gallery */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                <SummitNewsSection />
                <SponsorGrid
                  year={2026}
                  title="Summit Sponsors"
                  icon={<Building2 className="h-5 w-5" />}
                  showBecomeSponsorCTA={true}
                />
                <ImageGalleryCard />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
