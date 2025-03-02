import { useState, useCallback } from "react";
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
}

export function FileUpload({ 
  onUpload, 
  onError, 
  maxSize = 5 * 1024 * 1024, // 5MB default
  className 
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUpload(data.url);
      setPreview(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      onError?.(message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > maxSize) {
        setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        onError?.(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
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
        <div className="relative rounded-lg overflow-hidden">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-auto"
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
