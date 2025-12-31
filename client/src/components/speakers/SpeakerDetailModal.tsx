import { Speaker } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mic2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardCreatorButton } from "@/components/ui/card-creator";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <img
              src={speaker.photo}
              alt={speaker.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                {speaker.name}
                {speaker.isModerator && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    <Mic2 className="h-2.5 w-2.5 mr-0.5" />
                    Moderator
                  </Badge>
                )}
              </div>
              {(speaker.title || speaker.company) && (
                <p className="text-sm text-muted-foreground font-normal">
                  {speaker.title}
                  {speaker.title && speaker.company ? ", " : ""}
                  {speaker.company}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {speaker.bio && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {speaker.bio}
            </p>
          )}
          
          {speaker.bioUrl && (
            <a
              href={speaker.bioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
              data-testid={`link-speaker-bio-url-${speaker.id}`}
            >
              {speaker.urlText || "Learn more"}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          
          {speaker.photo && (
            <div className="mt-4 pt-4 border-t">
              <CardCreatorButton
                imageUrl={speaker.photo}
                speakerName={speaker.name}
                variant="default"
                size="default"
                className="w-full"
              />
            </div>
          )}
        </div>

        {(hasPrevious || hasNext) && (
          <div className="flex justify-between mt-6 pt-4 border-t">
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
