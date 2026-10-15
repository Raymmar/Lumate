import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Speaker, SpeakerWithSummits } from "@shared/schema";
import { SpeakerModal } from "@/components/agenda/SpeakerModal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/** Only mounted for admins by the shared speaker card. */
export function SpeakerActions({ speaker }: { speaker: Speaker }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Fetch all assignments when confirming deletion, even on a year-filtered public page.
  const { data, isFetching, isError } = useQuery({
    queryKey: ["/api/speakers", "delete-confirmation", speaker.id],
    queryFn: () => apiRequest<{ speakers: SpeakerWithSummits[] }>("/api/speakers"),
    enabled: deleting,
    staleTime: 0,
  });
  const profile = data?.speakers.find((s) => s.id === speaker.id);
  const sessions = profile?.summits.flatMap((summit) =>
    summit.sessions.map((session) => ({ ...session, year: summit.year })),
  ) ?? [];
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/speakers/${speaker.id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-blocks"] });
      setDeleting(false);
      toast({ title: "Speaker deleted" });
    },
    onError: (error: Error) =>
      toast({ title: "Failed to delete speaker", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            aria-label={`Actions for ${speaker.name}`} data-testid={`button-speaker-actions-${speaker.id}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)} data-testid={`button-edit-speaker-${speaker.id}`}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(true)}
            data-testid={`button-delete-speaker-${speaker.id}`}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SpeakerModal speaker={speaker} isOpen={editing} onClose={() => setEditing(false)} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {speaker.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the speaker profile and removes all their session assignments.
              Sessions themselves are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isFetching ? (
            <p className="text-sm text-muted-foreground">Loading session assignments…</p>
          ) : isError || !profile ? (
            <p role="alert" className="text-sm text-destructive">Could not load session assignments. Close and try again.</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">This speaker isn't assigned to any sessions.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto list-disc pl-5 text-sm text-muted-foreground"
              data-testid="list-delete-speaker-sessions">
              {sessions.map((session) => (
                <li key={session.id}>{session.year}: {session.title}{session.isModerator ? " (moderator)" : ""}</li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending || isFetching || isError || !profile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-speaker">
              Delete speaker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
