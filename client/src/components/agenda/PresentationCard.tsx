import { PresentationWithSpeakers, Speaker, AgendaSessionType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Mic2, GraduationCap, Presentation, Plus, UserPlus, ExternalLink, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { SpeakerModal } from "./SpeakerModal";
import { COLOR_MAP } from "./PresentationModal";
import { motion, AnimatePresence } from "framer-motion";
import { SpeakerDetailModal, SpeakerWithPresentation } from "@/components/speakers/SpeakerDetailModal";

interface PresentationCardProps {
  presentation: PresentationWithSpeakers;
  isAdmin?: boolean;
  onEdit?: (presentation: PresentationWithSpeakers) => void;
  onDuplicate?: (presentation: PresentationWithSpeakers) => void;
  isFullWidth?: boolean;
  sessionTypes?: AgendaSessionType[];
  allSpeakers?: Speaker[];
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const TRACK_ICONS: Record<string, JSX.Element> = {
  startup_school: <GraduationCap className="h-3 w-3" />,
  main_stage: <Presentation className="h-3 w-3" />,
};

export function PresentationCard({
  presentation,
  isAdmin = false,
  onEdit,
  onDuplicate,
  isFullWidth = false,
  sessionTypes = [],
  allSpeakers = [],
  isExpanded = false,
  onToggleExpanded,
}: PresentationCardProps) {
  const { toast } = useToast();
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false);
  const [selectedSpeakerIndex, setSelectedSpeakerIndex] = useState<number | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<(Speaker & { isModerator: boolean; displayOrder: number }) | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      toast({ title: "Speaker added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add speaker", variant: "destructive" });
    },
  });

  const removeSpeakerMutation = useMutation({
    mutationFn: async (speakerId: number) => {
      return apiRequest(`/api/presentations/${presentation.id}/speakers/${speakerId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      toast({ title: "Speaker removed from presentation" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove speaker", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/presentations/${presentation.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
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

  const sessionTypeConfig = sessionTypes.find(st => st.slug === presentation.sessionType);
  const sessionTypeColor = sessionTypeConfig?.color || "gray";
  const sessionTypeLabel = sessionTypeConfig?.label || presentation.sessionType;

  const sortedSpeakers = [...presentation.speakers].sort((a, b) => {
    if (a.isModerator && !b.isModerator) return -1;
    if (!a.isModerator && b.isModerator) return 1;
    return a.displayOrder - b.displayOrder;
  });

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-admin-menu]') || target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }
    onToggleExpanded?.();
  };

  return (
    <div 
      className={`group relative p-4 ${isFullWidth ? "bg-muted/30 border-b" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
      data-testid={`presentation-card-${presentation.id}`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs flex items-center gap-1.5">
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLOR_MAP[sessionTypeColor] || COLOR_MAP.gray }}
              />
              {sessionTypeLabel}
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
            <motion.div
              layout
              initial={false}
              animate={{ height: "auto" }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.p 
                layout
                className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {presentation.description}
              </motion.p>
            </motion.div>
          )}
        </div>

        {sortedSpeakers.length > 0 && (
          <button 
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded?.();
            }}
            data-testid={`button-toggle-speakers-${presentation.id}`}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-full text-xs gap-1"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-add-speaker-quick-${presentation.id}`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Speaker
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-presentation-menu-${presentation.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate?.(presentation);
                  }}
                  data-testid={`button-duplicate-presentation-${presentation.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
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
          </div>
        )}
      </div>

      {sortedSpeakers.length > 0 && (
        <div className="mt-3">
          <AnimatePresence mode="wait" initial={false}>
            {!isExpanded ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
              >
                {sortedSpeakers.map((speaker, index) => (
                  <motion.div 
                    key={speaker.id}
                    layoutId={`speaker-container-${presentation.id}-${speaker.id}`}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg py-1 px-2 transition-colors min-w-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSpeakerIndex(index);
                    }}
                    data-testid={`speaker-collapsed-${speaker.id}`}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <motion.img
                      layoutId={`speaker-avatar-${presentation.id}-${speaker.id}`}
                      src={speaker.photo}
                      alt={speaker.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    />
                    <motion.div 
                      layoutId={`speaker-name-${presentation.id}-${speaker.id}`}
                      className="flex flex-col min-w-0 flex-1"
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <span className="text-xs font-medium flex items-center gap-1 truncate">
                        <span className="truncate">{speaker.name}</span>
                        {speaker.isModerator && (
                          <Mic2 className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </span>
                      {(speaker.title || speaker.company) && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {speaker.title}{speaker.title && speaker.company ? ", " : ""}{speaker.company}
                        </span>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className={`grid gap-4 ${isFullWidth ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}
              >
                {sortedSpeakers.map((speaker, index) => (
                  <motion.div 
                    key={speaker.id}
                    layoutId={`speaker-container-${presentation.id}-${speaker.id}`}
                    className="group/speaker relative flex flex-col bg-background border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSpeakerIndex(index);
                    }}
                    data-testid={`speaker-card-${speaker.id}`}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-5 w-5 p-0 opacity-0 group-hover/speaker:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-speaker-menu-${speaker.id}`}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSpeaker(speaker);
                            }}
                            data-testid={`button-edit-speaker-${speaker.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSpeakerMutation.mutate(speaker.id);
                            }}
                            disabled={removeSpeakerMutation.isPending}
                            className="text-destructive"
                            data-testid={`button-remove-speaker-${speaker.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <div className="flex items-center gap-3">
                      <motion.img
                        layoutId={`speaker-avatar-${presentation.id}-${speaker.id}`}
                        src={speaker.photo}
                        alt={speaker.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      />
                      <motion.div 
                        layoutId={`speaker-name-${presentation.id}-${speaker.id}`}
                        className="flex flex-col min-w-0"
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <span className="text-sm font-medium flex items-center gap-1">
                          {speaker.name}
                          {speaker.isModerator && (
                            <Mic2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                        </span>
                        {(speaker.title || speaker.company) && (
                          <span className="text-xs text-muted-foreground">
                            {speaker.title}{speaker.title && speaker.company ? ", " : ""}{speaker.company}
                          </span>
                        )}
                      </motion.div>
                    </div>
                    {speaker.bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {speaker.bio}
                      </p>
                    )}
                    <div className="flex items-center mt-4 -mx-4 -mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs flex-1 rounded-none rounded-bl-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSpeakerIndex(index);
                        }}
                        data-testid={`button-view-more-${speaker.id}`}
                      >Full Bio</Button>
                      {speaker.bioUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs flex-1 rounded-none rounded-br-lg"
                          asChild
                        >
                          <a
                            href={speaker.bioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`link-speaker-url-${speaker.id}`}
                          >
                            {speaker.urlText || "Website"}
                            <ExternalLink className="!h-3 !w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <SpeakerModal
        speaker={null}
        isOpen={speakerModalOpen}
        onClose={() => setSpeakerModalOpen(false)}
        onCreated={(speakerId) => addSpeakerMutation.mutate(speakerId)}
      />
      <SpeakerModal
        speaker={editingSpeaker}
        isOpen={!!editingSpeaker}
        onClose={() => setEditingSpeaker(null)}
      />
      <SpeakerDetailModal
        speaker={selectedSpeakerIndex !== null ? sortedSpeakers[selectedSpeakerIndex] as SpeakerWithPresentation : null}
        isOpen={selectedSpeakerIndex !== null}
        onClose={() => setSelectedSpeakerIndex(null)}
        onPrevious={() => setSelectedSpeakerIndex(
          selectedSpeakerIndex === 0 ? sortedSpeakers.length - 1 : (selectedSpeakerIndex ?? 0) - 1
        )}
        onNext={() => setSelectedSpeakerIndex(
          selectedSpeakerIndex === sortedSpeakers.length - 1 ? 0 : (selectedSpeakerIndex ?? 0) + 1
        )}
        hasPrevious={sortedSpeakers.length > 1}
        hasNext={sortedSpeakers.length > 1}
      />
    </div>
  );
}

export default PresentationCard;
