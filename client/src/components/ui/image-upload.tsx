import { useState, useCallback } from 'react';
import { Button } from "./button";
import { Loader2, Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  defaultImage?: string;
}

export function ImageUpload({ onUpload, onError, defaultImage }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(defaultImage);

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setPreview(data.url);
      onUpload(data.url);
    } catch (error) {
      console.error('Upload failed:', error);
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onError]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  }, [uploadImage]);

  const handleRemove = useCallback(async () => {
    if (preview) {
      try {
        await fetch('/api/upload/image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: preview }),
        });
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
      setPreview(undefined);
      onUpload('');
    }
  }, [preview, onUpload]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => document.getElementById('imageUpload')?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        id="imageUpload"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border">
          <img
            src={preview}
            alt="Upload preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}