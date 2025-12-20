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
import { TimeInput } from "@/components/ui/time-input";
import { Loader2, Trash2 } from "lucide-react";
import { TimeBlock } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TimeBlockModalProps {
  timeBlock: TimeBlock | null;
  isOpen: boolean;
  onClose: () => void;
}

function extractDatePart(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractTimePart(dateString: string): string {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function TimeBlockModal({ timeBlock, isOpen, onClose }: TimeBlockModalProps) {
  const { toast } = useToast();
  const isEditing = !!timeBlock && timeBlock.id > 0;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTimeValue, setStartTimeValue] = useState("");
  const [endTimeValue, setEndTimeValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (timeBlock) {
      setTitle(timeBlock.title || "");
      setDescription(timeBlock.description || "");
      setDate(extractDatePart(timeBlock.startTime));
      setStartTimeValue(extractTimePart(timeBlock.startTime));
      setEndTimeValue(extractTimePart(timeBlock.endTime));
    } else {
      setTitle("");
      setDescription("");
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setDate(extractDatePart(now.toISOString()));
      setStartTimeValue(extractTimePart(now.toISOString()));
      setEndTimeValue(extractTimePart(oneHourLater.toISOString()));
    }
  }, [timeBlock, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/time-blocks", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      toast({ title: "Time block created successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create time block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/time-blocks/${timeBlock?.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      toast({ title: "Time block updated successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update time block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/time-blocks/${timeBlock?.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({ title: "Time block deleted successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete time block",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title: title.trim() || null,
      description: description.trim() || null,
      startTime: new Date(`${date}T${startTimeValue}`).toISOString(),
      endTime: new Date(`${date}T${endTimeValue}`).toISOString(),
      displayOrder: 0,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Time Block" : "Add Time Block"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the time block details."
                : "Create a new time block to organize presentations."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Morning Check-in & Registration"
                data-testid="input-time-block-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this time block..."
                rows={2}
                data-testid="input-time-block-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                data-testid="input-time-block-date"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <TimeInput
                  value={startTimeValue}
                  onChange={(time) => {
                    setStartTimeValue(time);
                    if (!endTimeValue || endTimeValue <= time) {
                      const [h, m] = time.split(':').map(Number);
                      const endMinutes = h * 60 + m + 60;
                      const endH = Math.floor(endMinutes / 60);
                      const endM = endMinutes % 60;
                      setEndTimeValue(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
                    }
                  }}
                  placeholder="e.g. 9:00 AM"
                  data-testid="input-time-block-start"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <TimeInput
                  value={endTimeValue}
                  onChange={setEndTimeValue}
                  placeholder="e.g. 10:00 AM"
                  data-testid="input-time-block-end"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              {isEditing ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-time-block"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                  data-testid="button-cancel-time-block"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-save-time-block"
                >
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Block?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the time block. Any presentations in this block will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-time-block">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-time-block"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
