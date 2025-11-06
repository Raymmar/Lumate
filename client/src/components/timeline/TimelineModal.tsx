import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TimelineEvent } from "@shared/schema";

interface TimelineModalProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

export function TimelineModal({ event, onClose }: TimelineModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [imageUrl, setImageUrl] = useState(event?.imageUrl || "");
  const [date, setDate] = useState(
    event?.date ? new Date(event.date).toISOString().split("T")[0] : ""
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { 
        title, 
        description, 
        imageUrl: imageUrl || null,
        date: date ? new Date(date).toISOString() : new Date().toISOString()
      };

      if (event) {
        return apiRequest(`/api/timeline/${event.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/timeline", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline"] });
      toast({
        title: "Success",
        description: `Timeline event ${event ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to save timeline event:", error);
      toast({
        title: "Error",
        description: "Failed to save timeline event",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "Image file size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setImageUrl(data.url);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Validation Error",
        description: "Date is required",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Timeline Event" : "Add Timeline Event"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "Update the details of this timeline event"
              : "Add a new milestone to your timeline"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Company Founded"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this milestone..."
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUpload">Or Upload Image</Label>
            <Input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
          </div>

          {imageUrl && (
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <img
                  src={imageUrl}
                  alt="Timeline event preview"
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}