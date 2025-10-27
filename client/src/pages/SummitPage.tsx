import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Building2,
  Users,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Post, Sponsor } from "@shared/schema";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <a
            href="https://www.dropbox.com/scl/fo/tx5vb725ywzytkfog1iv1/AGfyY_yWKWKsnOn64QjCXiA?rlkey=ue2nlaso4lrb3ug59memgqqmh&dl=0"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="outline"
              className="w-full justify-between font-normal hover:bg-muted"
            >
              <span className="flex items-center gap-2">Photos from 2025</span>
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

function AgendaCard() {
  return (
    <Card className="border w-full max-w-full overflow-hidden">
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-xl md:text-2xl">
          Tentative Event Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-4">
        <div className="space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              10:00 - 11:00
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                Morning Check-in & Registration
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Arrival, Networking + Startup Fair Opens
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              11:00 - 03:00
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                Startup Fair & Main Stage
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Share your idea, join a workshop or breakout, meet a mentor.
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              03:30 - 04:30
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                Investor Quick Pitch
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Select attendees will get to pitch investors and the crowd.
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              04:30 - 06:00
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                Afternoon Check-in + Networking
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Late Arrival + Food + Networking + Demo tables
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              06:00 - 08:30
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                Main Program
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Keynote presentation + Panel discussions + Q&A
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="font-semibold text-xs sm:text-sm text-muted-foreground sm:min-w-[90px] flex-shrink-0">
              08:30 - 10:00
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base md:text-lg">
                VIP Afterparty
              </div>
              <div className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                Join us for a special reception with live music, light bites and
                a cash bar
              </div>
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

  const handlePostClick = (post: Post, isEditing = false) => {
    if (isEditing) {
      setEditingPost(post);
    } else {
      const slug = formatPostTitleForUrl(post.title, post.id.toString());
      setLocation(`/post/${slug}`);
    }
  };

  const handleCreatePost = async (data: InsertPost) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiRequest("/api/admin/posts", "POST", data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/posts"] });
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
      await apiRequest(`/api/admin/posts/${editingPost.id}`, "PATCH", data);
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

function SponsorsGrid() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data, isLoading } = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: ["/api/sponsors?year=2026"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sponsors/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors?year=2026"] });
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sponsor",
        variant: "destructive",
      });
    },
  });

  const isAdmin = (user as any)?.isAdmin || (user as any)?.is_admin;
  const sponsors = data?.sponsors || [];

  const tiers = [
    {
      name: "Series A",
      key: "Series A",
      cols: 1,
    },
    { name: "Seed", key: "Seed", cols: 2 },
    { name: "Angel", key: "Angel", cols: 3 },
    {
      name: "Friends & Family",
      key: "Friends & Family",
      cols: 5,
    },
    {
      name: "501c3/.edu",
      key: "501c3/.edu",
      cols: 7,
      description: "Nonprofit & education sponsors",
    },
  ];

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this sponsor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingSponsor(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSponsor(null);
  };

  if (isLoading) {
    return (
      <Card className="border w-full max-w-full">
        <CardHeader className="p-3 md:p-4">
          <CardTitle>Summit Sponsors</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Temporarily removed visibility check for debugging
  // if (!isAdmin && sponsors.length === 0) {
  //   return null;
  // }

  return (
    <>
      <Card className="border w-full max-w-full overflow-hidden">
        <CardHeader className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Summit Sponsors
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://drive.google.com/file/d/1gcsQov4eRW_-GL25k1e7AypxU6qpxIWz/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-become-sponsor"
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Become a Sponsor</span>
                  <span className="sm:hidden">Sponsor</span>
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleAddNew}
                  data-testid="button-add-sponsor"
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sponsor
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 space-y-8">
          {tiers.map((tier) => {
            const tierSponsors = sponsors.filter((s) => s.tier === tier.key);

            return (
              <div key={tier.key} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                {tierSponsors.length === 0 ? (
                  <div className="flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddNew}
                      className="flex items-center gap-2"
                      data-testid={`button-add-sponsor-${tier.key}`}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Add sponsor to {tier.name}</span>
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`grid gap-4 ${
                      tier.cols === 1
                        ? "grid-cols-1"
                        : tier.cols === 2
                          ? "grid-cols-1 sm:grid-cols-2"
                          : tier.cols === 3
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    }`}
                  >
                    {tierSponsors.map((sponsor) => (
                      <a
                        key={sponsor.id}
                        href={sponsor.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group relative w-full max-w-full"
                        data-testid={`sponsor-card-${sponsor.id}`}
                      >
                        <div className="flex flex-col h-full w-full max-w-full border border-border rounded-lg p-3">
                          <div className="mb-3 bg-white dark:bg-white p-4 rounded-lg">
                            <img
                              src={sponsor.logo}
                              alt={sponsor.name}
                              className="w-full h-auto object-contain rounded-lg"
                            />
                          </div>
                          <div className="text-center">
                            <h4 className="font-semibold text-sm line-clamp-2">
                              {sponsor.name}
                            </h4>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.preventDefault()}
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-sponsor-menu-${sponsor.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEdit(sponsor);
                                  }}
                                  data-testid={`button-edit-sponsor-${sponsor.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete(sponsor.id);
                                  }}
                                  className="text-destructive"
                                  data-testid={`button-delete-sponsor-${sponsor.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </a>
                    ))}

                    {tier.key === "Seed" && tierSponsors.length % 2 === 1 && (
                      <a
                        href="https://drive.google.com/file/d/1gcsQov4eRW_-GL25k1e7AypxU6qpxIWz/view?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                        data-testid="cta-become-sponsor-seed"
                      >
                        <div className="flex flex-col h-full items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-muted-foreground/50 transition-colors">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>Become a Sponsor</span>
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {isModalOpen && (
        <SponsorModal sponsor={editingSponsor} onClose={handleCloseModal} />
      )}
    </>
  );
}

function SponsorModal({
  sponsor,
  onClose,
}: {
  sponsor: Sponsor | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(sponsor?.name || "");
  const [tier, setTier] = useState(sponsor?.tier || "Series A");
  const [logo, setLogo] = useState(sponsor?.logo || "");
  const [url, setUrl] = useState(sponsor?.url || "");
  const [year, setYear] = useState(sponsor?.year || 2026);
  const [companyId, setCompanyId] = useState<number | null>(
    sponsor?.companyId || null,
  );
  const [companySearch, setCompanySearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: companiesData } = useQuery<{ companies: any[] }>({
    queryKey: ["/api/companies"],
  });

  const companies = companiesData?.companies || [];
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()),
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { name, tier, logo, url, year, companyId };

      if (sponsor) {
        return apiRequest(`/api/sponsors/${sponsor.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/sponsors", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors?year=2026"] });
      toast({
        title: "Success",
        description: `Sponsor ${sponsor ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${sponsor ? "update" : "create"} sponsor`,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const formData = new FormData();
    formData.append("file", file); // Changed from "image" to "file"

    try {
      const response = await fetch("/api/upload/file", {
        // Changed endpoint to match post form
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Upload failed:", errorData);
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setLogo(data.url);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !tier || !logo) {
      toast({
        title: "Validation Error",
        description: "Name, tier, and logo are required",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {sponsor ? "Edit Sponsor" : "Add New Sponsor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor-name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="sponsor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sponsor name"
              data-testid="input-sponsor-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-tier" className="text-sm font-medium">
              Tier *
            </Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger
                id="sponsor-tier"
                data-testid="select-sponsor-tier"
              >
                <SelectValue placeholder="Select a tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Series A">Series A</SelectItem>
                <SelectItem value="Seed">Seed</SelectItem>
                <SelectItem value="Angel">Angel</SelectItem>
                <SelectItem value="Friends & Family">
                  Friends & Family
                </SelectItem>
                <SelectItem value="501c3/.edu">501c3/.edu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-logo" className="text-sm font-medium">
              Logo *
            </Label>
            <Input
              id="sponsor-logo"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              data-testid="input-sponsor-logo"
              disabled={uploadingImage}
              className="cursor-pointer file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {uploadingImage && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
            {logo && (
              <div className="mt-2">
                <img
                  src={logo}
                  alt="Preview"
                  className="max-w-xs max-h-32 object-contain border border-border rounded-md bg-muted/30"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-url" className="text-sm font-medium">
              URL
            </Label>
            <Input
              id="sponsor-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              data-testid="input-sponsor-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor-year" className="text-sm font-medium">
              Year
            </Label>
            <Input
              id="sponsor-year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              data-testid="input-sponsor-year"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-search" className="text-sm font-medium">
              Link to Company (Optional)
            </Label>
            <Input
              id="company-search"
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies..."
              data-testid="input-company-search"
            />
            {companySearch && filteredCompanies.length > 0 && (
              <div className="border border-border rounded-md max-h-40 overflow-y-auto bg-background">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      setCompanyId(company.id);
                      setCompanySearch(company.name);
                    }}
                    className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors text-foreground"
                    data-testid={`company-option-${company.id}`}
                  >
                    {company.name}
                  </div>
                ))}
              </div>
            )}
            {companyId && (
              <p className="text-sm text-muted-foreground mt-1">
                Linked to: {companies.find((c) => c.id === companyId)?.name}
                <button
                  type="button"
                  onClick={() => {
                    setCompanyId(null);
                    setCompanySearch("");
                  }}
                  className="ml-2 text-destructive hover:underline"
                  data-testid="button-clear-company"
                >
                  Clear
                </button>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || uploadingImage}
              data-testid="button-save-sponsor"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SummitPage() {
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
                Powered by{" "}
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
                <p className="text-m text-muted-foreground mb-4 flex-grow">
                  Experts in venture capital, software development, branding,
                  business formation, intellectual property rights, accounting,
                  finance + more will be on site for small group breakouts and
                  interactive workshops.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-startup-fair-cta"
                >
                  Details Coming Soon
                </Button>
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
                <p className="text-m text-muted-foreground mb-4 flex-grow">
                  Apply to speak and you might end up on the main stage. We're
                  looking for breakout stories, interesting uses of AI, deep
                  tech, hardware, robotics, 3D printing, digital media or vibe
                  code.
                </p>
                <Button className="w-full" data-testid="button-apply-speak">
                  <a
                    href="https://airtable.com/applDXoTdj4LPUUVc/shrzIM9RcYBek4C0k"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full"
                  >
                    Apply to Speak <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Keynote & Panels */}
            <Card
              className="h-full hover:shadow-lg transition-shadow w-full max-w-full"
              data-testid="card-keynote-panels"
            >
              <CardContent className="p-3 md:p-4 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  Keynote & Panels
                </h3>
                <p className="text-m text-muted-foreground mb-4 flex-grow">
                  Stay tuned as we announce our full agenda. Expect a mix of
                  keynote speakers and expert panelists discussing how AI and
                  modern tech trends will impact the world through the lens of
                  Florida's Gulf Coast.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                  data-testid="button-keynote-panels-cta"
                >
                  Details Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Speakers & Panelists Section */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Speakers & Panelists
            </h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
              data-testid="speakers-grid"
            >
              {/* Placeholder for speakers - will be populated as they are added */}
              <div className="text-center text-muted-foreground col-span-full py-8 border rounded-lg bg-muted/30">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Speaker lineup coming soon!</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Sidebar and Main Content */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left Sidebar - Event Links and Agenda */}
              <div className="lg:col-span-1 space-y-4">
                <EventLinksCard />
                <AgendaCard />
              </div>

              {/* Right Content - News Feed and Gallery */}
              <div className="lg:col-span-2 space-y-4 min-w-0">
                <SummitNewsSection />
                <SponsorsGrid />
                <ImageGalleryCard />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
