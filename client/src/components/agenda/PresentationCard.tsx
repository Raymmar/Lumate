import { PresentationWithSpeakers } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Mic2, GraduationCap, Presentation } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface PresentationCardProps {
  presentation: PresentationWithSpeakers;
  isAdmin?: boolean;
  onEdit?: (presentation: PresentationWithSpeakers) => void;
  isFullWidth?: boolean;
}

const SESSION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  keynote: { label: "Keynote", color: "bg-amber-500/10 text-amber-600" },
  panel: { label: "Panel", color: "bg-blue-500/10 text-blue-600" },
  workshop: { label: "Workshop", color: "bg-green-500/10 text-green-600" },
  break: { label: "Break", color: "bg-gray-500/10 text-gray-600" },
  networking: { label: "Networking", color: "bg-purple-500/10 text-purple-600" },
  round: { label: "Round", color: "bg-teal-500/10 text-teal-600" },
  talk: { label: "Talk", color: "bg-indigo-500/10 text-indigo-600" },
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
    color: "bg-gray-500/10 text-gray-600" 
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

          <h4 className="font-medium text-sm leading-snug mb-1">{presentation.title}</h4>

          {presentation.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {presentation.description}
            </p>
          )}

          {sortedSpeakers.length > 0 && (
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
            </div>
          )}
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
    </div>
  );
}

export default PresentationCard;
