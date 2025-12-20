import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, List, Clock, Users, Mic2, ChevronDown, ChevronUp, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { PresentationWithSpeakers, AgendaSessionType, Speaker, TimeBlockWithPresentations, TimeBlock } from "@shared/schema";
import { PresentationCard } from "./PresentationCard";
import { PresentationModal } from "./PresentationModal";
import { TimeBlockModal } from "./TimeBlockModal";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AgendaSectionProps {
  isAdmin?: boolean;
}

const SPEAKERS_EXPANDED_KEY = "agenda-speakers-expanded";

export function AgendaSection({ isAdmin = false }: AgendaSectionProps) {
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [isTimeBlockModalOpen, setIsTimeBlockModalOpen] = useState(false);
  const [editingPresentation, setEditingPresentation] = useState<PresentationWithSpeakers | null>(null);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(null);
  const [addingToTimeBlockId, setAddingToTimeBlockId] = useState<number | null>(null);
  const [globalSpeakersExpanded, setGlobalSpeakersExpanded] = useState(() => {
    const stored = localStorage.getItem(SPEAKERS_EXPANDED_KEY);
    return stored === "true";
  });
  const [expandedPresentations, setExpandedPresentations] = useState<Set<number>>(new Set());

  useEffect(() => {
    localStorage.setItem(SPEAKERS_EXPANDED_KEY, String(globalSpeakersExpanded));
  }, [globalSpeakersExpanded]);

  const toggleGlobalExpanded = () => {
    setGlobalSpeakersExpanded(prev => !prev);
    setExpandedPresentations(new Set());
  };

  const togglePresentationExpanded = (presentationId: number) => {
    setExpandedPresentations(prev => {
      const next = new Set(prev);
      if (next.has(presentationId)) {
        next.delete(presentationId);
      } else {
        next.add(presentationId);
      }
      return next;
    });
  };

  const isPresentationExpanded = (presentationId: number) => {
    if (expandedPresentations.has(presentationId)) {
      return !globalSpeakersExpanded;
    }
    return globalSpeakersExpanded;
  };

  const { data: timeBlocksData, isLoading: timeBlocksLoading } = useQuery<{ timeBlocks: TimeBlockWithPresentations[] }>({
    queryKey: ["/api/time-blocks"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: presentationsData, isLoading: presentationsLoading } = useQuery<{ presentations: PresentationWithSpeakers[] }>({
    queryKey: ["/api/presentations"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: sessionTypesData } = useQuery<{ sessionTypes: AgendaSessionType[] }>({
    queryKey: ["/api/agenda-session-types"],
    staleTime: 60000,
  });

  const { data: speakersData } = useQuery<{ speakers: Speaker[] }>({
    queryKey: ["/api/speakers"],
    staleTime: 60000,
    enabled: isAdmin,
  });

  const timeBlocks = timeBlocksData?.timeBlocks || [];
  const allPresentations = presentationsData?.presentations || [];
  const sessionTypes = sessionTypesData?.sessionTypes || [];
  const allSpeakers = speakersData?.speakers || [];

  const isLoading = timeBlocksLoading || presentationsLoading;

  const handleEditPresentation = (presentation: PresentationWithSpeakers) => {
    setEditingPresentation(presentation);
    setAddingToTimeBlockId(presentation.timeBlockId || null);
    setIsPresentationModalOpen(true);
  };

  const handleDuplicatePresentation = (presentation: PresentationWithSpeakers) => {
    const duplicated = {
      ...presentation,
      id: 0,
      title: `${presentation.title} (Copy)`,
      speakers: [],
    } as PresentationWithSpeakers;
    setEditingPresentation(duplicated);
    setAddingToTimeBlockId(presentation.timeBlockId || null);
    setIsPresentationModalOpen(true);
  };

  const handleAddPresentationToTimeBlock = (timeBlock: TimeBlockWithPresentations) => {
    const prefilled = {
      id: 0,
      title: "",
      description: null,
      timeBlockId: timeBlock.id,
      startTime: timeBlock.startTime,
      endTime: timeBlock.endTime,
      track: "main_stage",
      sessionType: "talk",
      isFullWidth: false,
      displayOrder: 0,
      speakers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PresentationWithSpeakers;
    setEditingPresentation(prefilled);
    setAddingToTimeBlockId(timeBlock.id);
    setIsPresentationModalOpen(true);
  };

  const handleAddTimeBlock = () => {
    setEditingTimeBlock(null);
    setIsTimeBlockModalOpen(true);
  };

  const handleEditTimeBlock = (timeBlock: TimeBlock) => {
    setEditingTimeBlock(timeBlock);
    setIsTimeBlockModalOpen(true);
  };

  const handleClosePresentationModal = () => {
    setIsPresentationModalOpen(false);
    setEditingPresentation(null);
    setAddingToTimeBlockId(null);
  };

  const handleCloseTimeBlockModal = () => {
    setIsTimeBlockModalOpen(false);
    setEditingTimeBlock(null);
  };

  const { toast } = useToast();
  
  // Count unassigned presentations
  const unassignedCount = allPresentations.filter(p => !p.timeBlockId).length;

  const backfillMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/backfill-time-blocks", "POST");
    },
    onSuccess: (data) => {
      toast({
        title: "Time blocks created",
        description: data.message || `Created ${data.createdBlocks} time blocks and assigned ${data.assignedPresentations} presentations`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create time blocks",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasContent = timeBlocks.length > 0 || allPresentations.length > 0;

  return (
    <>
      <Card className="w-full" data-testid="agenda-section">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Agenda
            </CardTitle>
            <div className="flex items-center gap-2">
              {view === "calendar" && hasContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={toggleGlobalExpanded}
                  data-testid="button-toggle-speakers-expanded"
                >
                  {globalSpeakersExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Expand All
                    </>
                  )}
                </Button>
              )}
              <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "table")}>
                <TabsList className="h-8">
                  <TabsTrigger value="calendar" className="text-xs px-2" data-testid="tab-calendar-view">
                    <Calendar className="h-3 w-3 mr-1" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs px-2" data-testid="tab-table-view">
                    <List className="h-3 w-3 mr-1" />
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasContent ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No agenda items scheduled yet.</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={handleAddTimeBlock} data-testid="button-add-first-time-block">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Time Block
                </Button>
              )}
            </div>
          ) : view === "calendar" ? (
            <CalendarView
              timeBlocks={timeBlocks}
              isAdmin={isAdmin}
              onEditPresentation={handleEditPresentation}
              onDuplicatePresentation={handleDuplicatePresentation}
              onAddPresentationToTimeBlock={handleAddPresentationToTimeBlock}
              onEditTimeBlock={handleEditTimeBlock}
              sessionTypes={sessionTypes}
              allSpeakers={allSpeakers}
              isPresentationExpanded={isPresentationExpanded}
              onTogglePresentationExpanded={togglePresentationExpanded}
            />
          ) : (
            <TableView
              presentations={allPresentations}
              isAdmin={isAdmin}
              onEdit={handleEditPresentation}
              onDuplicate={handleDuplicatePresentation}
              sessionTypes={sessionTypes}
              allSpeakers={allSpeakers}
            />
          )}

          {isAdmin && hasContent && (
            <div className="mt-6 pt-4 border-t flex justify-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleAddTimeBlock}
                className="gap-2"
                data-testid="button-add-time-block"
              >
                <Plus className="h-4 w-4" />
                Add Time Block
              </Button>
              {unassignedCount > 0 && (
                <Button 
                  variant="secondary" 
                  onClick={() => backfillMutation.mutate()}
                  disabled={backfillMutation.isPending}
                  className="gap-2"
                  data-testid="button-backfill-time-blocks"
                >
                  {backfillMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Auto-assign {unassignedCount} Presentations
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PresentationModal
        presentation={editingPresentation}
        isOpen={isPresentationModalOpen}
        onClose={handleClosePresentationModal}
        defaultTimeBlockId={addingToTimeBlockId}
      />

      <TimeBlockModal
        timeBlock={editingTimeBlock}
        isOpen={isTimeBlockModalOpen}
        onClose={handleCloseTimeBlockModal}
      />
    </>
  );
}

interface CalendarViewProps {
  timeBlocks: TimeBlockWithPresentations[];
  isAdmin: boolean;
  onEditPresentation: (presentation: PresentationWithSpeakers) => void;
  onDuplicatePresentation: (presentation: PresentationWithSpeakers) => void;
  onAddPresentationToTimeBlock: (timeBlock: TimeBlockWithPresentations) => void;
  onEditTimeBlock: (timeBlock: TimeBlock) => void;
  sessionTypes: AgendaSessionType[];
  allSpeakers: Speaker[];
  isPresentationExpanded: (presentationId: number) => boolean;
  onTogglePresentationExpanded: (presentationId: number) => void;
}

function CalendarView({ 
  timeBlocks, 
  isAdmin, 
  onEditPresentation, 
  onDuplicatePresentation, 
  onAddPresentationToTimeBlock, 
  onEditTimeBlock,
  sessionTypes, 
  allSpeakers, 
  isPresentationExpanded, 
  onTogglePresentationExpanded 
}: CalendarViewProps) {
  return (
    <div className="space-y-4">
      {timeBlocks.map((timeBlock) => {
        const presentations = timeBlock.presentations;
        const fullWidthPresentations = presentations.filter(p => p.isFullWidth);
        const trackPresentations = presentations.filter(p => !p.isFullWidth);

        const startupSchool = trackPresentations.filter(p => p.track === "startup_school");
        const mainStage = trackPresentations.filter(p => p.track === "main_stage");

        return (
          <div key={timeBlock.id} className="border rounded-lg overflow-hidden" data-testid={`time-block-${timeBlock.id}`}>
            <div className="group bg-muted/50 px-4 py-2 flex items-center justify-between text-sm font-medium border-b">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span className="flex-shrink-0">
                  {format(parseISO(timeBlock.startTime), "h:mm a")} - {format(parseISO(timeBlock.endTime), "h:mm a")}
                </span>
                <span className="truncate font-semibold">
                  {timeBlock.title}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onEditTimeBlock(timeBlock)}
                    data-testid={`button-edit-time-block-${timeBlock.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddPresentationToTimeBlock(timeBlock)}
                    data-testid={`button-add-presentation-to-block-${timeBlock.id}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {timeBlock.description && (
              <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/25 border-b">
                {timeBlock.description}
              </div>
            )}

            {presentations.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No presentations in this time block
              </div>
            ) : (
              <>
                {fullWidthPresentations.map((presentation) => (
                  <PresentationCard
                    key={presentation.id}
                    presentation={presentation}
                    isAdmin={isAdmin}
                    onEdit={onEditPresentation}
                    onDuplicate={onDuplicatePresentation}
                    isFullWidth
                    sessionTypes={sessionTypes}
                    allSpeakers={allSpeakers}
                    isExpanded={isPresentationExpanded(presentation.id)}
                    onToggleExpanded={() => onTogglePresentationExpanded(presentation.id)}
                  />
                ))}

                {trackPresentations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                    <div className="min-h-[80px]">
                      {startupSchool.length > 0 ? (
                        startupSchool.map((presentation) => (
                          <PresentationCard
                            key={presentation.id}
                            presentation={presentation}
                            isAdmin={isAdmin}
                            onEdit={onEditPresentation}
                            onDuplicate={onDuplicatePresentation}
                            sessionTypes={sessionTypes}
                            allSpeakers={allSpeakers}
                            isExpanded={isPresentationExpanded(presentation.id)}
                            onToggleExpanded={() => onTogglePresentationExpanded(presentation.id)}
                          />
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
                          <span className="opacity-50">Startup School</span>
                        </div>
                      )}
                    </div>
                    <div className="min-h-[80px]">
                      {mainStage.length > 0 ? (
                        mainStage.map((presentation) => (
                          <PresentationCard
                            key={presentation.id}
                            presentation={presentation}
                            isAdmin={isAdmin}
                            onEdit={onEditPresentation}
                            onDuplicate={onDuplicatePresentation}
                            sessionTypes={sessionTypes}
                            allSpeakers={allSpeakers}
                            isExpanded={isPresentationExpanded(presentation.id)}
                            onToggleExpanded={() => onTogglePresentationExpanded(presentation.id)}
                          />
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
                          <span className="opacity-50">Main Stage</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TableViewProps {
  presentations: PresentationWithSpeakers[];
  isAdmin: boolean;
  onEdit: (presentation: PresentationWithSpeakers) => void;
  onDuplicate: (presentation: PresentationWithSpeakers) => void;
  sessionTypes: AgendaSessionType[];
  allSpeakers: Speaker[];
}

function TableView({ presentations, isAdmin, onEdit, onDuplicate, sessionTypes, allSpeakers }: TableViewProps) {
  const sortedPresentations = [...presentations].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedPresentations.map((presentation) => (
        <div
          key={presentation.id}
          className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => isAdmin && onEdit(presentation)}
          data-testid={`presentation-row-${presentation.id}`}
        >
          <div className="flex-shrink-0 w-20 text-center">
            <div className="text-sm font-medium">
              {format(parseISO(presentation.startTime), "h:mm a")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(parseISO(presentation.endTime), "h:mm a")}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h4 className="font-medium truncate">{presentation.title}</h4>
              {presentation.isFullWidth && (
                <span className="flex-shrink-0 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  All Tracks
                </span>
              )}
            </div>
            {presentation.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {presentation.description}
              </p>
            )}
            {presentation.speakers.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Users className="h-3 w-3 text-muted-foreground" />
                {presentation.speakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-center gap-1">
                    <img
                      src={speaker.photo}
                      alt={speaker.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs">
                      {speaker.name}
                      {speaker.isModerator && (
                        <Mic2 className="inline h-3 w-3 ml-1 text-primary" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-xs text-muted-foreground capitalize">
            {presentation.track.replace("_", " ")}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AgendaSection;
