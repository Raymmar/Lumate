import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnsplashPicker } from "@/components/ui/unsplash-picker";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (url: string) => void;
  defaultValue?: string;
  className?: string;
}

export function ImageUpload({ onImageSelect, defaultValue, className }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue || '');

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    onImageSelect(url);
  };

  const handleUnsplashSelect = (url: string) => {
    setImageUrl(url);
    onImageSelect(url);
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Featured Image</Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <ImageIcon className="h-4 w-4 mr-2" />
                Choose from Unsplash
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[600px]">
              <DialogHeader>
                <DialogTitle>Choose an Image from Unsplash</DialogTitle>
              </DialogHeader>
              <UnsplashPicker onSelect={handleUnsplashSelect} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
          <Input
            type="url"
            value={imageUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Enter image URL or choose from Unsplash"
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
    </div>
  );
}
