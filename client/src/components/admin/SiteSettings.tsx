import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AdminImageUploader } from "./AdminImageUploader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function SiteSettings() {
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string>("");
  const { toast } = useToast();

  const handleImageUpload = (url: string) => {
    setFeaturedImageUrl(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(featuredImageUrl);
    toast({
      title: "Copied!",
      description: "Image URL copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Featured Section Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Background Image</h3>
              <AdminImageUploader onUploadComplete={handleImageUpload} />
            </div>
            
            {featuredImageUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Image URL</h3>
                <div className="flex gap-2">
                  <Input value={featuredImageUrl} readOnly />
                  <Button onClick={copyToClipboard}>Copy</Button>
                </div>
                <div className="aspect-video relative rounded-lg overflow-hidden">
                  <img 
                    src={featuredImageUrl} 
                    alt="Featured background preview" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
