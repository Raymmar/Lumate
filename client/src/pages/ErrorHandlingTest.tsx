import React, { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from '@/components/layout/PageContainer';
import { Loader2, Upload } from 'lucide-react';

export default function ErrorHandlingTest() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setLastErrorMessage(null);

    try {
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
        
        if (!response.ok || data.error) {
          const errorMessage = data.message || data.error || 'Upload failed';
          console.log('Upload error response:', data);
          throw new Error(errorMessage);
        }
      } catch (e) {
        if (e instanceof Error) {
          throw e; // Re-throw if it's already an Error with message
        }
        // If parsing fails or other error occurs
        throw new Error('Failed to process server response')
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      
      setLastErrorMessage(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-3xl font-bold mb-8">File Upload Error Handling Test</h1>
        <Card>
          <CardHeader>
            <CardTitle>Test File Upload</CardTitle>
            <CardDescription>
              This test page demonstrates improved error handling for file uploads. Try uploading a very large file to see the specific error message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </CardContent>
          {lastErrorMessage && (
            <CardFooter className="bg-destructive/10 text-destructive border-t">
              <div className="text-sm">
                <strong>Last Error:</strong> {lastErrorMessage}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}