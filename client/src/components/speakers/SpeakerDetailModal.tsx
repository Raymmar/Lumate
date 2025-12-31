import { Speaker } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeakerCardPreview } from "@/components/ui/card-creator";

export interface SpeakerWithPresentation extends Speaker {
  isModerator?: boolean;
  displayOrder?: number;
}

interface SpeakerDetailModalProps {
  speaker: SpeakerWithPresentation | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function SpeakerDetailModal({ 
  speaker, 
  isOpen, 
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false
}: SpeakerDetailModalProps) {
  if (!speaker) return null;

  const speakerTitle = [speaker.title, speaker.company].filter(Boolean).join(", ");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="sr-only">
          <DialogTitle>{speaker.name}</DialogTitle>
          <DialogDescription>Speaker details for {speaker.name}</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {speaker.photo && (
            <div>
              <SpeakerCardPreview
                imageUrl={speaker.photo}
                speakerName={speaker.name}
                speakerTitle={speakerTitle}
                badgeLabel="Speaker"
                showDownloadButton={true}
              />
            </div>
          )}

          <div className="flex flex-col text-left">
            <div className="flex items-start gap-4 mb-6">
              <img
                src={speaker.photo}
                alt={speaker.name}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
              <div className="text-left">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {speaker.name}
                  {speaker.isModerator && (
                    <Badge variant="secondary" className="text-xs">
                      Moderator
                    </Badge>
                  )}
                </h2>
                {speakerTitle && (
                  <p className="text-sm text-muted-foreground">{speakerTitle}</p>
                )}
              </div>
            </div>

            {speaker.bio && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-grow text-left">
                {speaker.bio}
              </p>
            )}

            {speaker.bioUrl && (
              <a
                href={speaker.bioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-6"
                data-testid={`link-speaker-bio-url-${speaker.id}`}
              >
                {speaker.urlText || "Learn more"}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {(hasPrevious || hasNext) && (
          <div className="flex justify-between pt-4 border-t mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              data-testid="button-previous-speaker"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
              data-testid="button-next-speaker"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
