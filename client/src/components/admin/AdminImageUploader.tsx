import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AdminImageUploaderProps {
  onUploadComplete?: (url: string) => void;
}

export function AdminImageUploader({ onUploadComplete }: AdminImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create form data
    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      if (onUploadComplete) {
        onUploadComplete(data.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        {isUploading && <div className="text-sm text-muted-foreground">Uploading...</div>}
      </div>
    </div>
  );
}
