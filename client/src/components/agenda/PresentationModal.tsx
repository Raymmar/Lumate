import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Mic2 } from "lucide-react";
import { PresentationWithSpeakers, Speaker } from "@shared/schema";
import { SpeakerModal } from "./SpeakerModal";
import { Badge } from "@/components/ui/badge";

interface PresentationModalProps {
  presentation: PresentationWithSpeakers | null;
  isOpen: boolean;
  onClose: () => void;
}

const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "panel", label: "Panel" },
  { value: "workshop", label: "Workshop" },
  { value: "break", label: "Break" },
  { value: "networking", label: "Networking" },
  { value: "round", label: "Round" },
  { value: "talk", label: "Talk" },
];

const TRACKS = [
  { value: "startup_school", label: "Startup School" },
  { value: "main_stage", label: "Main Stage" },
];

export function PresentationModal({ presentation, isOpen, onClose }: PresentationModalProps) {
  const { toast } = useToast();
  const isEditing = !!presentation;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [track, setTrack] = useState("main_stage");
  const [sessionType, setSessionType] = useState("talk");
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);

  const { data: speakersData } = useQuery<{ speakers: Speaker[] }>({
    queryKey: ["/api/speakers"],
  });

  const allSpeakers = speakersData?.speakers || [];

  useEffect(() => {
    if (presentation) {
      setTitle(presentation.title);
      setDescription(presentation.description || "");
      setStartTime(formatDateTimeForInput(presentation.startTime));
      setEndTime(formatDateTimeForInput(presentation.endTime));
      setTrack(presentation.track);
      setSessionType(presentation.sessionType);
      setIsFullWidth(presentation.isFullWidth);
      setDisplayOrder(presentation.displayOrder);
    } else {
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setTrack("main_stage");
      setSessionType("talk");
      setIsFullWidth(false);
      setDisplayOrder(0);
    }
  }, [presentation, isOpen]);

  function formatDateTimeForInput(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      const data = {
        title,
        description: description || null,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        track,
        sessionType,
        isFullWidth,
        displayOrder,
      };

      if (isEditing) {
        return apiRequest(`/api/presentations/${presentation.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/presentations", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({
        title: "Success",
        description: `Presentation ${isEditing ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} presentation`,
        variant: "destructive",
      });
    },
  });

  const addSpeakerMutation = useMutation({
    mutationFn: async (speakerId: number) => {
      return apiRequest(`/api/presentations/${presentation!.id}/speakers`, "POST", {
        speakerId,
        isModerator: false,
        displayOrder: presentation!.speakers.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({ title: "Speaker added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add speaker", variant: "destructive" });
    },
  });

  const removeSpeakerMutation = useMutation({
    mutationFn: async (speakerId: number) => {
      return apiRequest(`/api/presentations/${presentation!.id}/speakers/${speakerId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({ title: "Speaker removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove speaker", variant: "destructive" });
    },
  });

  const toggleModeratorMutation = useMutation({
    mutationFn: async ({ speakerId, isModerator }: { speakerId: number; isModerator: boolean }) => {
      return apiRequest(`/api/presentations/${presentation!.id}/speakers/${speakerId}`, "PATCH", {
        isModerator,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update speaker", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  const availableSpeakers = allSpeakers.filter(
    (s) => !presentation?.speakers.find((ps) => ps.id === s.id)
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Presentation" : "Add Presentation"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update presentation details and manage speakers." : "Create a new agenda item."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Presentation title"
                required
                data-testid="input-presentation-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={3}
                data-testid="input-presentation-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  data-testid="input-presentation-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  data-testid="input-presentation-end-time"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="track">Track</Label>
                <Select value={track} onValueChange={setTrack}>
                  <SelectTrigger data-testid="select-presentation-track">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger data-testid="select-presentation-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="isFullWidth" className="font-medium">Full Width</Label>
                <p className="text-xs text-muted-foreground">Spans all tracks (for breaks, networking)</p>
              </div>
              <Switch
                id="isFullWidth"
                checked={isFullWidth}
                onCheckedChange={setIsFullWidth}
                data-testid="switch-presentation-full-width"
              />
            </div>

            {isEditing && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Speakers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSpeaker(null);
                      setSpeakerModalOpen(true);
                    }}
                    data-testid="button-create-new-speaker"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Speaker
                  </Button>
                </div>

                {presentation.speakers.length > 0 && (
                  <div className="space-y-2">
                    {presentation.speakers.map((speaker) => (
                      <div
                        key={speaker.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={speaker.photo}
                            alt={speaker.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium">{speaker.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {speaker.title} {speaker.company && `at ${speaker.company}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant={speaker.isModerator ? "default" : "ghost"}
                            size="sm"
                            onClick={() =>
                              toggleModeratorMutation.mutate({
                                speakerId: speaker.id,
                                isModerator: !speaker.isModerator,
                              })
                            }
                            className="h-7 text-xs"
                            data-testid={`button-toggle-moderator-${speaker.id}`}
                          >
                            <Mic2 className="h-3 w-3 mr-1" />
                            Mod
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSpeakerMutation.mutate(speaker.id)}
                            className="h-7 w-7 p-0 text-destructive"
                            data-testid={`button-remove-speaker-${speaker.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {availableSpeakers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Add Existing Speaker</Label>
                    <Select onValueChange={(val) => addSpeakerMutation.mutate(parseInt(val))}>
                      <SelectTrigger data-testid="select-add-speaker">
                        <SelectValue placeholder="Select a speaker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSpeakers.map((speaker) => (
                          <SelectItem key={speaker.id} value={speaker.id.toString()}>
                            <div className="flex items-center gap-2">
                              <img
                                src={speaker.photo}
                                alt={speaker.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              {speaker.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-presentation">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Presentation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SpeakerModal
        speaker={editingSpeaker}
        isOpen={speakerModalOpen}
        onClose={() => setSpeakerModalOpen(false)}
        onCreated={isEditing ? (speakerId) => addSpeakerMutation.mutate(speakerId) : undefined}
      />
    </>
  );
}

export default PresentationModal;
