import { Speaker } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeakerCardPreview } from "@/components/ui/card-creator";
import { Link } from "wouter";

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
      <DialogContent className="max-w-4xl p-4 sm:p-6 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="sr-only">
          <DialogTitle>{speaker.name}</DialogTitle>
          <DialogDescription>Speaker details for {speaker.name}</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 pt-2">
          {speaker.photo && (
            <div className="space-y-3">
              <SpeakerCardPreview
                imageUrl={speaker.photo}
                speakerName={speaker.name}
                speakerTitle={speakerTitle}
                badgeLabel="Speaker"
                showDownloadButton={true}
                showOverlayToggle={true}
              />
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link 
                  href={`/card-creator?photo=${encodeURIComponent(speaker.photo)}&name=${encodeURIComponent(speaker.name)}&title=${encodeURIComponent(speakerTitle)}`}
                  data-testid="link-customize-card"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Customize in Card Creator
                </Link>
              </Button>
            </div>
          )}

          <div className="flex flex-col">
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <img
                src={speaker.photo}
                alt={speaker.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold flex flex-wrap items-center gap-2">
                  {speaker.name}
                  {speaker.isModerator && (
                    <Badge variant="secondary" className="text-xs">
                      Moderator
                    </Badge>
                  )}
                </h2>
                {speakerTitle && (
                  <p className="text-sm text-muted-foreground break-words">{speakerTitle}</p>
                )}
              </div>
            </div>

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
          </div>
        </div>

        {(hasPrevious || hasNext) && (
          <div className="flex justify-between mt-4 sticky bottom-0 bg-background p-4 sm:p-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 pt-[0px] pb-[0px] pl-[8px] pr-[8px]">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              data-testid="button-previous-speaker"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5 sm:mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
              data-testid="button-next-speaker"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-0.5 sm:ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
