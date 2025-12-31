import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Upload, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OVERLAY_URL = "https://file-upload.replit.app/api/storage/images%2F1767191519304-Speaker-card-overlay.png";
const CANVAS_SIZE = 1080;
const USER_IMAGE_SIZE = CANVAS_SIZE * 0.5;
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
  isOpen: boolean;
  onClose: () => void;
  mode?: "speaker" | "upload";
}

export function CardCreator({ 
  imageUrl, 
  speakerName,
  isOpen, 
  onClose,
  mode = "speaker"
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
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  const drawCanvas = useCallback(async () => {
    if (!canvasRef.current || !currentImageUrl) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    try {
      const [userImage, overlayImage] = await Promise.all([
        loadImage(getProxiedUrl(currentImageUrl)),
        loadImage(getProxiedUrl(OVERLAY_URL))
      ]);

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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

      ctx.drawImage(overlayImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      setIsLoading(false);
    } catch (err) {
      console.error("Error drawing canvas:", err);
      setError("Failed to generate card. Please try again.");
      setIsLoading(false);
    }
  }, [currentImageUrl, loadImage]);

  useEffect(() => {
    if (isOpen && currentImageUrl) {
      drawCanvas();
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
            {mode === "speaker" ? "Download Speaker Card" : "Create Your Promo Card"}
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
                {isUploading ? "Uploading..." : uploadedImage ? "Change Photo" : "Upload Your Photo"}
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

interface CardCreatorButtonProps {
  imageUrl: string;
  speakerName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CardCreatorButton({
  imageUrl,
  speakerName,
  variant = "outline",
  size = "sm",
  className
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
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="speaker"
      />
    </>
  );
}
