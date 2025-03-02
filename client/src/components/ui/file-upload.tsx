import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X } from "lucide-react";

interface FileUploadProps {
  onUpload: (url: string) => void;
  onError?: (error: string) => void;
  maxSize?: number;
  className?: string;
  defaultValue?: string | null;
}

export function FileUpload({ 
  onUpload, 
  onError, 
  maxSize = 5 * 1024 * 1024,
  className,
  defaultValue
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(defaultValue || null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    // Create a preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Starting file upload:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error('No URL returned from server');
      }

      console.log('Upload successful:', data.url);

      // Clean up the temporary preview URL
      URL.revokeObjectURL(objectUrl);

      // Verify the URL is accessible
      const imgResponse = await fetch(data.url, { method: 'HEAD' });
      if (!imgResponse.ok) {
        throw new Error('Failed to verify uploaded image');
      }

      // Set the actual uploaded URL
      setPreview(data.url);
      onUpload(data.url);

    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      onError?.(message);

      // Keep the preview if there's an error
      if (defaultValue) {
        setPreview(defaultValue);
      } else {
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
      }
    } finally {
      setUploading(false);
      setProgress(100);
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
    if (preview && preview !== defaultValue) {
      URL.revokeObjectURL(preview);
    }
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
            onError={(e) => {
              console.error('Image preview failed to load:', preview);
              const message = 'Failed to load preview image';
              setError(message);
              onError?.(message);
              if (!defaultValue) {
                setPreview(null);
              }
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