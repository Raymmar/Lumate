import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface FileUploadProps {
  onUploadComplete: (url: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG or PNG image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiKey = import.meta.env.VITE_FILE_UPLOAD_API_KEY;
      console.log('Debug - Upload Request:', {
        apiKeyPresent: !!apiKey,
        apiKeyLength: apiKey?.length,
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name
      });

      const headers = new Headers();
      headers.append('X-API-KEY', apiKey);

      const response = await fetch('https://file-upload.replit.app/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers),
          error: errorText
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.data.url) {
        onUploadComplete(`https://file-upload.replit.app${data.data.url}`);
        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Upload error details:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-4 items-center">
      <Input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        disabled={isUploading}
        className="max-w-[300px]"
      />
      {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
  );
};