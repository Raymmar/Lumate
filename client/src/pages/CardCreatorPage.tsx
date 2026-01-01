import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Download,
  Upload,
  Loader2,
  Users,
  Building2,
  Palette,
  Search,
  RotateCcw,
  Sparkles,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { CARD_OVERLAYS, getDefaultOverlay, type CardOverlay } from "@/config/cardOverlays";
import { SPONSOR_TIERS } from "@/components/sponsors/sponsorConfig";
import type { Speaker, Sponsor } from "@shared/schema";

const CANVAS_SIZE = 1080;
const USER_IMAGE_SIZE = CANVAS_SIZE * 0.6;
const USER_IMAGE_OFFSET = (CANVAS_SIZE - USER_IMAGE_SIZE) / 2;

interface CanvasSticker {
  id: string;
  type: "sponsor" | "badge";
  imageUrl: string;
  cachedProxyUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  aspectRatio: number;
}

function getProxiedUrl(url: string): string {
  if (url.startsWith("data:")) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

const ALL_BADGE_OPTIONS = ["Attendee", "Speaker", "Volunteer", "Sponsor", "Organizer"] as const;
const USER_BADGE_OPTIONS = ["Attendee", "Volunteer"] as const;
type BadgeOption = typeof ALL_BADGE_OPTIONS[number];

export default function CardCreatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.isAdmin === true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const stickersRef = useRef<CanvasSticker[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Read URL params for pre-filling
  const urlParams = new URLSearchParams(window.location.search);
  const initialPhoto = urlParams.get("photo");
  const initialName = urlParams.get("name") || "Your Name";
  const initialTitle = urlParams.get("title") || "Your Title";

  const [selectedOverlay, setSelectedOverlay] = useState<CardOverlay>(getDefaultOverlay());
  const [selectedImage, setSelectedImage] = useState<string | null>(initialPhoto);
  const [selectedName, setSelectedName] = useState(initialName);
  const [selectedTitle, setSelectedTitle] = useState(initialTitle);
  const [badgeLabel, setBadgeLabel] = useState<BadgeOption>(initialPhoto ? "Speaker" : "Attendee");
  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [isPresetSelected, setIsPresetSelected] = useState(!!initialPhoto);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const RESIZE_HANDLE_SIZE = 24;
  const DELETE_BUTTON_SIZE = 32;

  const { data: speakersData, isLoading: loadingSpeakers } = useQuery<{ speakers: Speaker[] }>({
    queryKey: ["/api/speakers"],
  });

  const { data: sponsorsData, isLoading: loadingSponsors } = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: ["/api/sponsors"],
  });

  const speakers = speakersData?.speakers || [];
  const sponsors = sponsorsData?.sponsors || [];

  const filteredSpeakers = speakers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSponsors = sponsors.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    const cached = imageCache.current.get(src);
    if (cached && cached.complete) {
      return Promise.resolve(cached);
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCache.current.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  const drawCanvas = useCallback(async (exportMode: boolean = false) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shouldShowLoading = !isDragging && !exportMode;
    if (shouldShowLoading) {
      setIsLoading(true);
    }

    try {
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (selectedImage) {
        const userProxyUrl = getProxiedUrl(selectedImage);
        const userImage = await loadImage(userProxyUrl);

        const aspectRatio = userImage.width / userImage.height;
        let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

        if (aspectRatio > 1) {
          drawHeight = USER_IMAGE_SIZE;
          drawWidth = USER_IMAGE_SIZE * aspectRatio;
          offsetX = USER_IMAGE_OFFSET - (drawWidth - USER_IMAGE_SIZE) / 2;
          offsetY = USER_IMAGE_OFFSET;
        } else {
          drawWidth = USER_IMAGE_SIZE;
          drawHeight = USER_IMAGE_SIZE / aspectRatio;
          offsetX = USER_IMAGE_OFFSET;
          offsetY = USER_IMAGE_OFFSET - (drawHeight - USER_IMAGE_SIZE) / 2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(USER_IMAGE_OFFSET, USER_IMAGE_OFFSET, USER_IMAGE_SIZE, USER_IMAGE_SIZE);
        ctx.clip();
        ctx.drawImage(userImage, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
      }

      const overlayProxyUrl = getProxiedUrl(selectedOverlay.url);
      const overlayImage = await loadImage(overlayProxyUrl);
      ctx.drawImage(overlayImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const textPadding = 60;
      const nameY = 60;

      ctx.font = "bold 56px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(selectedName, textPadding, nameY);

      ctx.font = "500 36px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(selectedTitle, textPadding, nameY + 65);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      ctx.font = "italic bold 72px 'Georgia', 'Times New Roman', serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(badgeLabel, CANVAS_SIZE - textPadding, CANVAS_SIZE - 60);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      const stickersToRender = (isDragging || isResizing) ? stickersRef.current : stickers;
      for (const sticker of stickersToRender) {
        try {
          const stickerImage = await loadImage(sticker.cachedProxyUrl);
          const padding = 12;
          const borderRadius = 12;
          const bgX = sticker.x - padding;
          const bgY = sticker.y - padding;
          const bgWidth = sticker.width + padding * 2;
          const bgHeight = sticker.height + padding * 2;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(bgX + borderRadius, bgY);
          ctx.lineTo(bgX + bgWidth - borderRadius, bgY);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + borderRadius);
          ctx.lineTo(bgX + bgWidth, bgY + bgHeight - borderRadius);
          ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - borderRadius, bgY + bgHeight);
          ctx.lineTo(bgX + borderRadius, bgY + bgHeight);
          ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - borderRadius);
          ctx.lineTo(bgX, bgY + borderRadius);
          ctx.quadraticCurveTo(bgX, bgY, bgX + borderRadius, bgY);
          ctx.closePath();
          
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          
          const isSelected = sticker.id === selectedStickerId && !exportMode;
          if (isSelected) {
            ctx.strokeStyle = "#3B82F6";
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.restore();

          ctx.drawImage(stickerImage, sticker.x, sticker.y, sticker.width, sticker.height);
          
          if (isSelected) {
            const handleSize = RESIZE_HANDLE_SIZE;
            const handleX = bgX + bgWidth - handleSize / 2;
            const handleY = bgY + bgHeight - handleSize / 2;
            ctx.fillStyle = "#3B82F6";
            ctx.beginPath();
            ctx.arc(handleX, handleY, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            ctx.beginPath();
            ctx.moveTo(handleX - 5, handleY - 5);
            ctx.lineTo(handleX + 5, handleY + 5);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(handleX + 5, handleY + 5);
            ctx.lineTo(handleX + 1, handleY + 5);
            ctx.moveTo(handleX + 5, handleY + 5);
            ctx.lineTo(handleX + 5, handleY + 1);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(handleX - 5, handleY - 5);
            ctx.lineTo(handleX - 1, handleY - 5);
            ctx.moveTo(handleX - 5, handleY - 5);
            ctx.lineTo(handleX - 5, handleY - 1);
            ctx.stroke();

            const deleteX = bgX + bgWidth - DELETE_BUTTON_SIZE / 2 + 4;
            const deleteY = bgY - DELETE_BUTTON_SIZE / 2 + 8;
            ctx.fillStyle = "#EF4444";
            ctx.beginPath();
            ctx.arc(deleteX, deleteY, DELETE_BUTTON_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(deleteX - 6, deleteY - 6);
            ctx.lineTo(deleteX + 6, deleteY + 6);
            ctx.moveTo(deleteX + 6, deleteY - 6);
            ctx.lineTo(deleteX - 6, deleteY + 6);
            ctx.stroke();
          }
        } catch (err) {
          console.error("Failed to load sticker:", sticker.name);
        }
      }

      if (shouldShowLoading) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error drawing canvas:", err);
      if (shouldShowLoading) {
        setIsLoading(false);
      }
    }
  }, [selectedImage, selectedOverlay, selectedName, selectedTitle, badgeLabel, stickers, selectedStickerId, isDragging, isResizing, loadImage, RESIZE_HANDLE_SIZE, DELETE_BUTTON_SIZE]);

  useEffect(() => {
    stickersRef.current = stickers;
  }, [stickers]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [selectedImage, selectedOverlay, selectedName, selectedTitle, badgeLabel, selectedStickerId]);
  
  useEffect(() => {
    if (!isDragging && !isResizing) {
      drawCanvas();
    }
  }, [stickers, isDragging, isResizing]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    
    await drawCanvas(true);
    
    const link = document.createElement("a");
    const filename = `${selectedName.replace(/\s+/g, "-").toLowerCase()}-promo-card.jpg`;
    link.download = filename;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
    
    await drawCanvas(false);
    
    toast({
      title: "Card Downloaded",
      description: "Your promotional card has been saved!",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setSelectedImage(data.url);
      setIsPresetSelected(false);
      setBadgeLabel("Attendee");
      setSelectedName("Your Name");
      setSelectedTitle("Your Title");
      toast({
        title: "Image uploaded",
        description: "Your photo was uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectSpeaker = (speaker: Speaker) => {
    setSelectedImage(speaker.photo);
    setSelectedName(speaker.name);
    setSelectedTitle(speaker.title && speaker.company ? `${speaker.title}, ${speaker.company}` : speaker.title || speaker.company || "");
    setBadgeLabel("Speaker");
    setIsPresetSelected(true);
  };

  const addSponsorSticker = async (sponsor: Sponsor) => {
    try {
      const cacheBuster = `${sponsor.logo.includes('?') ? '&' : '?'}cb=${Date.now()}`;
      const freshUrl = sponsor.logo + cacheBuster;
      const proxyUrl = getProxiedUrl(freshUrl);
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = proxyUrl;
      });
      
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const baseWidth = 300;
      const width = baseWidth;
      const height = baseWidth / aspectRatio;
      
      const newSticker: CanvasSticker = {
        id: `sticker-${Date.now()}`,
        type: "sponsor",
        imageUrl: sponsor.logo,
        cachedProxyUrl: proxyUrl,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width,
        height,
        name: sponsor.name,
        aspectRatio,
      };
      setStickers((prev) => [...prev, newSticker]);
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to load ${sponsor.name} logo`,
        variant: "destructive",
      });
    }
  };

  const removeSticker = (stickerId: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== stickerId));
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedName("Your Name");
    setSelectedTitle("Your Title");
    setBadgeLabel("Attendee");
    setStickers([]);
    setSelectedOverlay(getDefaultOverlay());
    setSelectedStickerId(null);
    setIsPresetSelected(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0;
      clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY || 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getHitTarget = (x: number, y: number): { sticker: CanvasSticker | null; action: "drag" | "resize" | "delete" | null } => {
    const padding = 12;
    
    if (selectedStickerId) {
      const selectedSticker = stickers.find(s => s.id === selectedStickerId);
      if (selectedSticker) {
        const bgX = selectedSticker.x - padding;
        const bgY = selectedSticker.y - padding;
        const bgWidth = selectedSticker.width + padding * 2;
        const bgHeight = selectedSticker.height + padding * 2;

        const deleteX = bgX + bgWidth - DELETE_BUTTON_SIZE / 2 + 4;
        const deleteY = bgY - DELETE_BUTTON_SIZE / 2 + 8;
        const deleteDistance = Math.sqrt((x - deleteX) ** 2 + (y - deleteY) ** 2);
        if (deleteDistance <= DELETE_BUTTON_SIZE / 2 + 5) {
          return { sticker: selectedSticker, action: "delete" };
        }

        const handleX = bgX + bgWidth - RESIZE_HANDLE_SIZE / 2;
        const handleY = bgY + bgHeight - RESIZE_HANDLE_SIZE / 2;
        const resizeDistance = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
        if (resizeDistance <= RESIZE_HANDLE_SIZE / 2 + 5) {
          return { sticker: selectedSticker, action: "resize" };
        }
      }
    }

    for (let i = stickers.length - 1; i >= 0; i--) {
      const sticker = stickers[i];
      const bgX = sticker.x - padding;
      const bgY = sticker.y - padding;
      const bgWidth = sticker.width + padding * 2;
      const bgHeight = sticker.height + padding * 2;
      
      if (x >= bgX && x <= bgX + bgWidth && y >= bgY && y <= bgY + bgHeight) {
        return { sticker, action: "drag" };
      }
    }
    return { sticker: null, action: null };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const { sticker, action } = getHitTarget(x, y);
    
    if (action === "delete" && sticker) {
      removeSticker(sticker.id);
      setSelectedStickerId(null);
      e.preventDefault();
      return;
    }
    
    if (action === "resize" && sticker) {
      setIsResizing(true);
      setSelectedStickerId(sticker.id);
      e.preventDefault();
      return;
    }
    
    if (sticker) {
      setSelectedStickerId(sticker.id);
      setIsDragging(true);
      setDragOffset({ x: x - sticker.x, y: y - sticker.y });
      e.preventDefault();
    } else {
      setSelectedStickerId(null);
    }
  };

  const scheduleRedraw = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      drawCanvas();
      animationFrameRef.current = null;
    });
  }, [drawCanvas]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isResizing && selectedStickerId) {
      stickersRef.current = stickersRef.current.map((s) => {
        if (s.id !== selectedStickerId) return s;
        const padding = 12;
        const newWidth = Math.max(50, x - s.x + padding);
        const newHeight = newWidth / s.aspectRatio;
        return { ...s, width: newWidth, height: newHeight };
      });
      scheduleRedraw();
      return;
    }
    
    if (!isDragging || !selectedStickerId) return;

    stickersRef.current = stickersRef.current.map((s) =>
      s.id === selectedStickerId
        ? { ...s, x: x - dragOffset.x, y: y - dragOffset.y }
        : s
    );
    scheduleRedraw();
  };

  const handleCanvasMouseUp = () => {
    if (isDragging || isResizing) {
      setStickers([...stickersRef.current]);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const { sticker, action } = getHitTarget(x, y);
    
    if (action === "delete" && sticker) {
      removeSticker(sticker.id);
      setSelectedStickerId(null);
      e.preventDefault();
      return;
    }
    
    if (action === "resize" && sticker) {
      setIsResizing(true);
      setSelectedStickerId(sticker.id);
      e.preventDefault();
      return;
    }
    
    if (sticker) {
      setSelectedStickerId(sticker.id);
      setIsDragging(true);
      setDragOffset({ x: x - sticker.x, y: y - sticker.y });
      e.preventDefault();
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isResizing && selectedStickerId) {
      stickersRef.current = stickersRef.current.map((s) => {
        if (s.id !== selectedStickerId) return s;
        const padding = 12;
        const newWidth = Math.max(50, x - s.x + padding);
        const newHeight = newWidth / s.aspectRatio;
        return { ...s, width: newWidth, height: newHeight };
      });
      scheduleRedraw();
      e.preventDefault();
      return;
    }
    
    if (!isDragging || !selectedStickerId) return;

    stickersRef.current = stickersRef.current.map((s) =>
      s.id === selectedStickerId
        ? { ...s, x: x - dragOffset.x, y: y - dragOffset.y }
        : s
    );
    scheduleRedraw();
    e.preventDefault();
  };

  const handleCanvasTouchEnd = () => {
    if (isDragging || isResizing) {
      setStickers([...stickersRef.current]);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  return (
    <DashboardLayout hideSidebar>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Create and download shareable summit cards</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/speakers">
              <Button variant="outline" size="sm" data-testid="button-explore-speakers">
                Explore Speakers
              </Button>
            </Link>
            <Link href="/summit">
              <Button size="sm" data-testid="button-summit-tickets">
                Get Summit Tickets
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {CARD_OVERLAYS.map((overlay) => (
                  <button
                    key={overlay.id}
                    onClick={() => setSelectedOverlay(overlay)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                      selectedOverlay.id === overlay.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid={`overlay-select-${overlay.id}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: overlay.color }}
                    />
                    <span className="text-sm font-medium">{overlay.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              {isPresetSelected && !isAdmin && (
                <p className="text-xs text-muted-foreground mb-3">
                  Speaker cards are read-only. Upload your own photo to customize.
                </p>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    placeholder="Enter name"
                    disabled={(isPresetSelected && !isAdmin) || !user}
                    data-testid="input-card-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    placeholder="Enter title"
                    disabled={(isPresetSelected && !isAdmin) || !user}
                    data-testid="input-card-title"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Badge</label>
                  {(isPresetSelected && !isAdmin) || !user ? (
                    <Input
                      value={badgeLabel}
                      disabled
                      data-testid="input-card-badge-readonly"
                    />
                  ) : (
                    <Select
                      value={badgeLabel}
                      onValueChange={(value) => setBadgeLabel(value as BadgeOption)}
                    >
                      <SelectTrigger data-testid="select-card-badge">
                        <SelectValue placeholder="Select badge type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(isAdmin ? ALL_BADGE_OPTIONS : USER_BADGE_OPTIONS).map((option) => (
                          <SelectItem key={option} value={option} data-testid={`badge-option-${option.toLowerCase()}`}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <Tabs defaultValue="speakers" className="bg-card border rounded-lg">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="speakers" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Speakers
                </TabsTrigger>
                <TabsTrigger value="sponsors" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Sponsors
                </TabsTrigger>
              </TabsList>

              <div className="p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    data-testid="input-asset-search"
                  />
                </div>

                <TabsContent value="speakers" className="mt-0">
                  <ScrollArea className="h-[300px]">
                    {loadingSpeakers ? (
                      <div className="flex items-center justify-center h-20">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : filteredSpeakers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No speakers found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredSpeakers.map((speaker) => (
                          <button
                            key={speaker.id}
                            onClick={() => selectSpeaker(speaker)}
                            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                            data-testid={`speaker-select-${speaker.id}`}
                          >
                            <img
                              src={speaker.photo}
                              alt={speaker.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{speaker.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {speaker.company || speaker.title}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="sponsors" className="mt-0">
                  <ScrollArea className="h-[300px]">
                    {loadingSponsors ? (
                      <div className="flex items-center justify-center h-20">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : filteredSponsors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No sponsors found</p>
                    ) : (
                      <div className="space-y-4">
                        {SPONSOR_TIERS.map((tier) => {
                          const tierSponsors = filteredSponsors.filter((s) => s.tier === tier.key);
                          if (tierSponsors.length === 0) return null;
                          return (
                            <div key={tier.key}>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{tier.name}</h4>
                              <div className="grid grid-cols-3 gap-2">
                                {tierSponsors.map((sponsor) => (
                                  <button
                                    key={sponsor.id}
                                    onClick={() => addSponsorSticker(sponsor)}
                                    className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-muted transition-colors"
                                    title={`Add ${sponsor.name} logo as sticker`}
                                    data-testid={`sponsor-sticker-${sponsor.id}`}
                                  >
                                    <div className="w-12 h-12 flex items-center justify-center bg-white rounded p-1">
                                      <img
                                        src={sponsor.logo}
                                        alt={sponsor.name}
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                                      {sponsor.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>

            {stickers.length > 0 && (
              <div className="bg-muted/50 border rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  {stickers.length} sticker{stickers.length > 1 ? "s" : ""} added. Click to select, drag to move, use corner handle to resize.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border rounded-lg p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Preview</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  {user && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-upload-image"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="button-upload-image"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload Photo
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="relative aspect-square w-full max-w-lg mx-auto bg-muted rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full object-contain ${
                    isResizing ? "cursor-nwse-resize" : 
                    isDragging ? "cursor-grabbing" : 
                    stickers.length > 0 ? "cursor-grab" : ""
                  }`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {!selectedImage && !isLoading && stickers.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none z-0">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Select a speaker or upload a photo</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleDownload}
                disabled={isLoading}
                className="w-full mt-4"
                size="lg"
                data-testid="button-download-card"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Card
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Log in to upload your own photo
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
