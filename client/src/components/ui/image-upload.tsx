import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import { Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (url: string) => void;
  defaultValue?: string;
  className?: string;
}

export function ImageUpload({ onImageSelect, defaultValue, className }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue || '');
  const [isUnsplashOpen, setIsUnsplashOpen] = useState(false);

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    onImageSelect(url);
  };

  const handleUnsplashSelect = (url: string) => {
    setImageUrl(url);
    onImageSelect(url);
    setIsUnsplashOpen(false);
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Featured Image</Label>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => setIsUnsplashOpen(true)}
            className="h-8"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Choose Image
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            type="url"
            value={imageUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Enter image URL"
            className="bg-background flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleUrlChange('')}
            className="shrink-0"
          >
            Clear
          </Button>
        </div>
        {imageUrl && (
          <div className="relative aspect-video mt-2 rounded-lg overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt="Featured"
              className="object-cover w-full h-full"
            />
          </div>
        )}
      </div>

      <Dialog open={isUnsplashOpen} onOpenChange={setIsUnsplashOpen}>
        <DialogContent className="max-w-3xl h-[600px]">
          <DialogHeader>
            <DialogTitle>Choose an Image</DialogTitle>
          </DialogHeader>
          <UnsplashPicker onSelect={handleUnsplashSelect} />
        </DialogContent>
      </Dialog>
    </div>
  );
}