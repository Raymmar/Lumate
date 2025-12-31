import { Speaker } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="sr-only">
          <DialogTitle>{speaker.name}</DialogTitle>
          <DialogDescription>Speaker card for {speaker.name}</DialogDescription>
        </DialogHeader>
        
        {speaker.photo && (
          <SpeakerCardPreview
            imageUrl={speaker.photo}
            speakerName={speaker.name}
            speakerTitle={speakerTitle}
            badgeLabel="Speaker"
            showDownloadButton={true}
          />
        )}

        {(hasPrevious || hasNext) && (
          <div className="flex justify-between pt-2">
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
