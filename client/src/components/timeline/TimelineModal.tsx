import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertTimelineEventSchema, type TimelineEvent } from "@shared/schema";
import { z } from "zod";

interface TimelineModalProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

const formSchema = insertTimelineEventSchema.extend({
  date: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Title is required"),
});

type FormData = z.infer<typeof formSchema>;

export function TimelineModal({ event, onClose }: TimelineModalProps) {
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      imageUrl: event?.imageUrl || "",
      date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        imageUrl: data.imageUrl || null,
      };

      if (event) {
        return apiRequest(`/api/timeline/${event.id}`, "PATCH", payload);
      } else {
        return apiRequest("/api/timeline", "POST", payload);
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
      form.setValue("imageUrl", data.url);
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

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const imageUrl = form.watch("imageUrl");

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-timeline-title"
                      placeholder="e.g., Company Founded"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      data-testid="input-timeline-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      data-testid="input-timeline-description"
                      placeholder="Describe this milestone..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      data-testid="input-timeline-imageurl"
                      placeholder="https://example.com/image.jpg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2">
              <Label htmlFor="imageUpload">Or Upload Image</Label>
              <Input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                data-testid="input-timeline-image-upload"
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
                    data-testid="img-timeline-preview"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-timeline"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                data-testid="button-save-timeline"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
