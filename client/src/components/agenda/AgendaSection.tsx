import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, List, Clock, Users, Mic2 } from "lucide-react";
import { PresentationWithSpeakers } from "@shared/schema";
import { PresentationCard } from "./PresentationCard";
import { PresentationModal } from "./PresentationModal";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface AgendaSectionProps {
  isAdmin?: boolean;
}

export function AgendaSection({ isAdmin = false }: AgendaSectionProps) {
  const [view, setView] = useState<"calendar" | "table">("calendar");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPresentation, setEditingPresentation] = useState<PresentationWithSpeakers | null>(null);

  const { data, isLoading } = useQuery<{ presentations: PresentationWithSpeakers[] }>({
    queryKey: ["/api/presentations"],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const presentations = data?.presentations || [];

  const { groupedByTime, sortedTimeSlots } = useMemo(() => {
    const grouped = presentations.reduce((acc, presentation) => {
      const startTime = presentation.startTime;
      if (!acc[startTime]) {
        acc[startTime] = [];
      }
      acc[startTime].push(presentation);
      return acc;
    }, {} as Record<string, PresentationWithSpeakers[]>);

    const sorted = Object.keys(grouped).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    return { groupedByTime: grouped, sortedTimeSlots: sorted };
  }, [presentations]);

  const handleEdit = (presentation: PresentationWithSpeakers) => {
    setEditingPresentation(presentation);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPresentation(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPresentation(null);
  };

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

  return (
    <>
      <Card className="w-full" data-testid="agenda-section">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Agenda
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          {presentations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No presentations scheduled yet.</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={handleAdd} data-testid="button-add-first-presentation">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Presentation
                </Button>
              )}
            </div>
          ) : view === "calendar" ? (
            <CalendarView
              sortedTimeSlots={sortedTimeSlots}
              groupedByTime={groupedByTime}
              isAdmin={isAdmin}
              onEdit={handleEdit}
            />
          ) : (
            <TableView
              presentations={presentations}
              isAdmin={isAdmin}
              onEdit={handleEdit}
            />
          )}

          {isAdmin && presentations.length > 0 && (
            <div className="mt-6 pt-4 border-t flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleAdd}
                className="gap-2"
                data-testid="button-add-presentation"
              >
                <Plus className="h-4 w-4" />
                Add Presentation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PresentationModal
        presentation={editingPresentation}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}

interface CalendarViewProps {
  sortedTimeSlots: string[];
  groupedByTime: Record<string, PresentationWithSpeakers[]>;
  isAdmin: boolean;
  onEdit: (presentation: PresentationWithSpeakers) => void;
}

function CalendarView({ sortedTimeSlots, groupedByTime, isAdmin, onEdit }: CalendarViewProps) {
  return (
    <div className="space-y-4">
      {sortedTimeSlots.map((timeSlot) => {
        const presentations = groupedByTime[timeSlot];
        const fullWidthPresentations = presentations.filter(p => p.isFullWidth);
        const trackPresentations = presentations.filter(p => !p.isFullWidth);

        const startupSchool = trackPresentations.filter(p => p.track === "startup_school");
        const mainStage = trackPresentations.filter(p => p.track === "main_stage");

        return (
          <div key={timeSlot} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 text-sm font-medium border-b">
              <Clock className="h-4 w-4" />
              {format(parseISO(timeSlot), "h:mm a")}
            </div>

            {fullWidthPresentations.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                isAdmin={isAdmin}
                onEdit={onEdit}
                isFullWidth
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
                        onEdit={onEdit}
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
                        onEdit={onEdit}
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
}

function TableView({ presentations, isAdmin, onEdit }: TableViewProps) {
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
