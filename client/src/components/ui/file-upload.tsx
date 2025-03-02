import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X } from "lucide-react";

interface FileUploadProps {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in bytes
  className?: string;
  defaultValue?: string;
}

export function FileUpload({ 
  onUpload, 
  onError, 
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  defaultValue
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Handle defaultValue initialization
  useEffect(() => {
    if (defaultValue) {
      validateImageUrl(defaultValue)
        .then(() => setPreview(defaultValue))
        .catch(() => {
          setError("Failed to load default image");
          onError?.("Failed to load default image");
        });
    }
  }, [defaultValue, onError]);

  // Validate image URL
  const validateImageUrl = async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    // Create temporary preview
    const objectUrl = URL.createObjectURL(file);
    try {
      // Validate the image can be loaded before uploading
      await validateImageUrl(objectUrl);
      setPreview(objectUrl);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setError("Invalid image file");
      onError?.("Invalid image file");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const data = await response.json();

      // Clean up the temporary preview URL
      URL.revokeObjectURL(objectUrl);

      // Validate the uploaded image URL
      await validateImageUrl(data.url);

      // Set the actual uploaded URL
      setPreview(data.url);
      onUpload(data.url);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      onError?.(message);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > maxSize) {
        const message = `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`;
        setError(message);
        onError?.(message);
        return;
      }
      handleUpload(file);
    }
  }, [maxSize, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
  });

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    onUpload('');
  };

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {preview ? (
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-auto object-cover"
            onError={() => {
              setError('Failed to load image preview');
              setPreview(null);
              onError?.('Failed to load image preview');
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearPreview}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200 ease-in-out
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={progress} className="w-[60%]" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Drop your image here or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, GIF, WEBP (max {maxSize / 1024 / 1024}MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}