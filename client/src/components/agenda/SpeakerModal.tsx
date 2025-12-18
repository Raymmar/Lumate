import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, User } from "lucide-react";
import { Speaker } from "@shared/schema";

interface SpeakerModalProps {
  speaker: Speaker | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (speakerId: number) => void;
}

export function SpeakerModal({ speaker, isOpen, onClose, onCreated }: SpeakerModalProps) {
  const { toast } = useToast();
  const isEditing = !!speaker;

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bioUrl, setBioUrl] = useState("");
  const [urlText, setUrlText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (speaker) {
      setName(speaker.name);
      setBio(speaker.bio || "");
      setPhoto(speaker.photo);
      setTitle(speaker.title || "");
      setCompany(speaker.company || "");
      setBioUrl(speaker.bioUrl || "");
      setUrlText(speaker.urlText || "");
    } else {
      setName("");
      setBio("");
      setPhoto("");
      setTitle("");
      setCompany("");
      setBioUrl("");
      setUrlText("");
    }
  }, [speaker, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Speaker> => {
      const data = {
        name,
        bio: bio || null,
        photo,
        title: title || null,
        company: company || null,
        bioUrl: bioUrl || null,
        urlText: urlText || null,
      };

      if (isEditing) {
        return apiRequest(`/api/speakers/${speaker.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/speakers", "POST", data);
      }
    },
    onSuccess: (result: Speaker) => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({
        title: "Success",
        description: `Speaker ${isEditing ? "updated" : "created"} successfully`,
      });
      if (!isEditing && onCreated && result?.id) {
        onCreated(result.id);
      }
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} speaker`,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setPhoto(data.url);
      toast({
        title: "Image uploaded",
        description: "Speaker photo uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !photo) {
      toast({
        title: "Validation Error",
        description: "Name and photo are required",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Speaker" : "Add Speaker"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update speaker information." : "Add a new speaker to the system."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="photo" className="block mb-2">Photo *</Label>
              <div className="flex gap-2">
                <Input
                  id="photoUrl"
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  placeholder="Image URL"
                  className="flex-1"
                  data-testid="input-speaker-photo-url"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="icon" disabled={uploadingImage} asChild>
                    <span>
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Speaker name"
              required
              data-testid="input-speaker-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., CEO"
                data-testid="input-speaker-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Mote Marine"
                data-testid="input-speaker-company"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief speaker bio..."
              rows={3}
              data-testid="input-speaker-bio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bioUrl">Bio URL</Label>
              <Input
                id="bioUrl"
                type="url"
                value={bioUrl}
                onChange={(e) => setBioUrl(e.target.value)}
                placeholder="https://..."
                data-testid="input-speaker-bio-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urlText">Link Text</Label>
              <Input
                id="urlText"
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                placeholder="e.g., Learn more"
                data-testid="input-speaker-url-text"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-speaker">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Speaker"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SpeakerModal;
