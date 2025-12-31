import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Upload, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OVERLAY_URL =
  "https://file-upload.replit.app/api/storage/images%2F1767194323312-Speaker-card-overlay5.png";
const CANVAS_SIZE = 1080;
const USER_IMAGE_SIZE = CANVAS_SIZE * 0.6;
const USER_IMAGE_OFFSET = (CANVAS_SIZE - USER_IMAGE_SIZE) / 2;

function getProxiedUrl(url: string): string {
  if (url.startsWith("data:")) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

interface CardCreatorProps {
  imageUrl?: string;
  speakerName?: string;
  speakerTitle?: string;
  badgeLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  mode?: "speaker" | "upload";
}

export function CardCreator({
  imageUrl,
  speakerName = "Speaker Name",
  speakerTitle = "Title, Company",
  badgeLabel = "Speaker",
  isOpen,
  onClose,
  mode = "speaker",
}: CardCreatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentImageUrl = mode === "upload" ? uploadedImage : imageUrl;

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log("Image loaded successfully:", src.substring(0, 100));
        resolve(img);
      };
      img.onerror = (e) => {
        console.error("Image load failed:", src.substring(0, 100), e);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }, []);

  const drawCanvas = useCallback(async () => {
    console.log(
      "drawCanvas called, currentImageUrl:",
      currentImageUrl?.substring(0, 80),
    );
    if (!canvasRef.current || !currentImageUrl) {
      console.log(
        "Early return - canvas:",
        !!canvasRef.current,
        "url:",
        !!currentImageUrl,
      );
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    const userProxyUrl = getProxiedUrl(currentImageUrl);
    const overlayProxyUrl = getProxiedUrl(OVERLAY_URL);
    console.log("Loading user image from:", userProxyUrl.substring(0, 100));
    console.log("Loading overlay from:", overlayProxyUrl.substring(0, 100));

    try {
      const [userImage, overlayImage] = await Promise.all([
        loadImage(userProxyUrl),
        loadImage(overlayProxyUrl),
      ]);

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const aspectRatio = userImage.width / userImage.height;
      let drawWidth: number,
        drawHeight: number,
        offsetX: number,
        offsetY: number;

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
      ctx.rect(
        USER_IMAGE_OFFSET,
        USER_IMAGE_OFFSET,
        USER_IMAGE_SIZE,
        USER_IMAGE_SIZE,
      );
      ctx.clip();
      ctx.drawImage(userImage, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      ctx.drawImage(overlayImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw speaker name (top left) - 16px equivalent from top
      const textPadding = 60;
      const nameY = 60;

      // Speaker name - bold, larger text
      ctx.font =
        "bold 56px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // Add text shadow for better readability
      ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(speakerName, textPadding, nameY);

      // Speaker title - smaller text, black
      ctx.font =
        "500 36px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(speakerTitle, textPadding, nameY + 65);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw badge label (bottom right) - "Speaker"
      ctx.font = "italic bold 72px 'Georgia', 'Times New Roman', serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // Add slight shadow for depth
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(badgeLabel, CANVAS_SIZE - textPadding, CANVAS_SIZE - 60);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      setIsLoading(false);
    } catch (err) {
      console.error("Error drawing canvas:", err);
      setError("Failed to generate card. Please try again.");
      setIsLoading(false);
    }
  }, [currentImageUrl, loadImage, speakerName, speakerTitle, badgeLabel]);

  useEffect(() => {
    if (isOpen && currentImageUrl) {
      // Small delay to ensure canvas is mounted and rendered
      const timer = setTimeout(() => {
        drawCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentImageUrl, drawCanvas]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    const filename = speakerName
      ? `${speakerName.replace(/\s+/g, "-").toLowerCase()}-speaker-card.jpg`
      : "promo-card.jpg";

    link.download = filename;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setUploadedImage(data.url);
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
      setError("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "speaker"
              ? "Download Speaker Card"
              : "Create Your Promo Card"}
          </DialogTitle>
          <DialogDescription>
            {mode === "speaker"
              ? "Download your personalized speaker card to share on social media."
              : "Upload your photo to create a promotional card for the event."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "upload" && (
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-upload-photo"
              />
              <Button
                variant="outline"
                onClick={triggerFileUpload}
                className="w-full"
                disabled={isUploading}
                data-testid="button-upload-photo"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading
                  ? "Uploading..."
                  : uploadedImage
                    ? "Change Photo"
                    : "Upload Your Photo"}
              </Button>
            </div>
          )}

          <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{ display: currentImageUrl ? "block" : "none" }}
            />

            {!currentImageUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2" />
                <p className="text-sm">Upload a photo to preview your card</p>
              </div>
            )}

            {isLoading && currentImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            onClick={handleDownload}
            disabled={isLoading || !currentImageUrl}
            className="w-full"
            data-testid="button-download-card"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SpeakerCardPreviewProps {
  imageUrl: string;
  speakerName?: string;
  speakerTitle?: string;
  badgeLabel?: string;
  showDownloadButton?: boolean;
  className?: string;
}

export function SpeakerCardPreview({
  imageUrl,
  speakerName = "Speaker Name",
  speakerTitle = "Title, Company",
  badgeLabel = "Speaker",
  showDownloadButton = true,
  className,
}: SpeakerCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  const drawCanvas = useCallback(async () => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    const userProxyUrl = getProxiedUrl(imageUrl);
    const overlayProxyUrl = getProxiedUrl(OVERLAY_URL);

    try {
      const [userImage, overlayImage] = await Promise.all([
        loadImage(userProxyUrl),
        loadImage(overlayProxyUrl),
      ]);

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const aspectRatio = userImage.width / userImage.height;
      let drawWidth: number,
        drawHeight: number,
        offsetX: number,
        offsetY: number;

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
      ctx.rect(
        USER_IMAGE_OFFSET,
        USER_IMAGE_OFFSET,
        USER_IMAGE_SIZE,
        USER_IMAGE_SIZE,
      );
      ctx.clip();
      ctx.drawImage(userImage, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      ctx.drawImage(overlayImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw speaker name (top left) - 60px from top for more room
      const textPadding = 60;
      const nameY = 60;

      ctx.font =
        "bold 56px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(speakerName, textPadding, nameY);

      ctx.font =
        "500 36px 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(speakerTitle, textPadding, nameY + 65);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw badge label (bottom right)
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
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      setIsLoading(false);
    } catch (err) {
      console.error("Error drawing canvas:", err);
      setError("Failed to generate card.");
      setIsLoading(false);
    }
  }, [imageUrl, loadImage, speakerName, speakerTitle, badgeLabel]);

  useEffect(() => {
    if (imageUrl) {
      const timer = setTimeout(() => drawCanvas(), 100);
      return () => clearTimeout(timer);
    }
  }, [imageUrl, drawCanvas]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    const filename = speakerName
      ? `${speakerName.replace(/\s+/g, "-").toLowerCase()}-speaker-card.jpg`
      : "promo-card.jpg";
    link.download = filename;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div className={className}>
      <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: imageUrl ? "block" : "none" }}
        />
        {isLoading && imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive text-center mt-2">{error}</p>
      )}
      {showDownloadButton && (
        <Button
          onClick={handleDownload}
          disabled={isLoading || !imageUrl}
          className="w-full mt-4"
          data-testid="button-download-card"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Card
        </Button>
      )}
    </div>
  );
}

interface CardCreatorButtonProps {
  imageUrl: string;
  speakerName?: string;
  speakerTitle?: string;
  badgeLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CardCreatorButton({
  imageUrl,
  speakerName,
  speakerTitle,
  badgeLabel = "Speaker",
  variant = "outline",
  size = "sm",
  className,
}: CardCreatorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={className}
        data-testid="button-open-card-creator"
      >
        <Download className="h-4 w-4 mr-1" />
        Promo Card
      </Button>
      <CardCreator
        imageUrl={imageUrl}
        speakerName={speakerName}
        speakerTitle={speakerTitle}
        badgeLabel={badgeLabel}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="speaker"
      />
    </>
  );
}
