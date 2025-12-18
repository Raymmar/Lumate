import { PresentationWithSpeakers, Speaker } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Mic2, GraduationCap, Presentation, Plus, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { SpeakerModal } from "./SpeakerModal";

interface PresentationCardProps {
  presentation: PresentationWithSpeakers;
  isAdmin?: boolean;
  onEdit?: (presentation: PresentationWithSpeakers) => void;
  isFullWidth?: boolean;
}

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  keynote: { label: "Keynote", color: "bg-amber-500 text-white" },
  panel: { label: "Panel", color: "bg-blue-500 text-white" },
  workshop: { label: "Workshop", color: "bg-green-500 text-white" },
  break: { label: "Break", color: "bg-gray-500 text-white" },
  networking: { label: "Networking", color: "bg-purple-500 text-white" },
  round: { label: "Round", color: "bg-teal-500 text-white" },
  talk: { label: "Talk", color: "bg-indigo-500 text-white" },
};

const TRACK_ICONS: Record<string, JSX.Element> = {
  startup_school: <GraduationCap className="h-3 w-3" />,
  main_stage: <Presentation className="h-3 w-3" />,
};

export function PresentationCard({
  presentation,
  isAdmin = false,
  onEdit,
  isFullWidth = false,
}: PresentationCardProps) {
  const { toast } = useToast();
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);

  const { data: speakersData } = useQuery<{ speakers: Speaker[] }>({
    queryKey: ["/api/speakers"],
    enabled: isAdmin,
  });

  const allSpeakers = speakersData?.speakers || [];
  const assignedSpeakerIds = new Set(presentation.speakers.map(s => s.id));
  const availableSpeakers = allSpeakers.filter(s => !assignedSpeakerIds.has(s.id));

  const addSpeakerMutation = useMutation({
    mutationFn: async (speakerId: number) => {
      return apiRequest(`/api/presentations/${presentation.id}/speakers`, "POST", {
        speakerId,
        isModerator: false,
        displayOrder: presentation.speakers.length,
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/presentations/${presentation.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({
        title: "Success",
        description: "Presentation deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete presentation",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this presentation?")) {
      deleteMutation.mutate();
    }
  };

  const sessionTypeInfo = SESSION_TYPE_LABELS[presentation.sessionType] || { 
    label: presentation.sessionType, 
    color: "bg-gray-500 text-white" 
  };

  const sortedSpeakers = [...presentation.speakers].sort((a, b) => {
    if (a.isModerator && !b.isModerator) return -1;
    if (!a.isModerator && b.isModerator) return 1;
    return a.displayOrder - b.displayOrder;
  });

  return (
    <div 
      className={`group relative p-4 ${isFullWidth ? "bg-muted/30" : ""} hover:bg-muted/50 transition-colors`}
      data-testid={`presentation-card-${presentation.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${sessionTypeInfo.color}`}>
              {sessionTypeInfo.label}
            </span>
            {!isFullWidth && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 capitalize">
                {TRACK_ICONS[presentation.track]}
                {presentation.track.replace("_", " ")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {format(parseISO(presentation.startTime), "h:mm a")} - {format(parseISO(presentation.endTime), "h:mm a")}
            </span>
          </div>

          <h4 className="font-medium leading-snug mb-1">{presentation.title}</h4>

          {presentation.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {presentation.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {sortedSpeakers.map((speaker) => (
              <div 
                key={speaker.id} 
                className="flex items-center gap-1.5 bg-background border rounded-full px-2 py-1"
              >
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-xs font-medium">
                  {speaker.name}
                </span>
                {speaker.isModerator && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    <Mic2 className="h-2.5 w-2.5 mr-0.5" />
                    Mod
                  </Badge>
                )}
              </div>
            ))}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 rounded-full text-xs gap-1"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-add-speaker-quick-${presentation.id}`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Speaker
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpeakerModalOpen(true);
                    }}
                    data-testid={`button-create-speaker-${presentation.id}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Speaker
                  </DropdownMenuItem>
                  {availableSpeakers.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {availableSpeakers.map((speaker) => (
                        <DropdownMenuItem
                          key={speaker.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            addSpeakerMutation.mutate(speaker.id);
                          }}
                          disabled={addSpeakerMutation.isPending}
                          data-testid={`button-add-speaker-${speaker.id}`}
                        >
                          <img
                            src={speaker.photo}
                            alt={speaker.name}
                            className="w-5 h-5 rounded-full object-cover mr-2"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{speaker.name}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-presentation-menu-${presentation.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(presentation);
                }}
                data-testid={`button-edit-presentation-${presentation.id}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                data-testid={`button-delete-presentation-${presentation.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <SpeakerModal
        speaker={null}
        isOpen={speakerModalOpen}
        onClose={() => setSpeakerModalOpen(false)}
        onCreated={(speakerId) => addSpeakerMutation.mutate(speakerId)}
      />
    </div>
  );
}

export default PresentationCard;
