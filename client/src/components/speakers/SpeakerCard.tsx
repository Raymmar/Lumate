import { Speaker } from "@shared/schema";
import { ExternalLink, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface SpeakerWithPresentation extends Speaker {
  isModerator?: boolean;
  displayOrder?: number;
}

interface SpeakerCardProps {
  speaker: SpeakerWithPresentation;
  variant?: "compact" | "expanded";
  onClick?: () => void;
  layoutIdPrefix?: string;
}

export function SpeakerCard({ 
  speaker, 
  variant = "expanded", 
  onClick,
  layoutIdPrefix = "speaker"
}: SpeakerCardProps) {
  if (variant === "compact") {
    return (
      <motion.div 
        layoutId={layoutIdPrefix ? `${layoutIdPrefix}-container-${speaker.id}` : undefined}
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg py-1 px-2 transition-colors min-w-0"
        onClick={onClick}
        data-testid={`speaker-compact-${speaker.id}`}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.img
          layoutId={layoutIdPrefix ? `${layoutIdPrefix}-avatar-${speaker.id}` : undefined}
          src={speaker.photo}
          alt={speaker.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.div 
          layoutId={layoutIdPrefix ? `${layoutIdPrefix}-name-${speaker.id}` : undefined}
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
    );
  }

  return (
    <motion.div 
      layoutId={layoutIdPrefix ? `${layoutIdPrefix}-container-${speaker.id}` : undefined}
      className="group/speaker relative flex flex-col bg-background border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
      data-testid={`speaker-card-${speaker.id}`}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex items-center gap-3">
        <motion.img
          layoutId={layoutIdPrefix ? `${layoutIdPrefix}-avatar-${speaker.id}` : undefined}
          src={speaker.photo}
          alt={speaker.name}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.div 
          layoutId={layoutIdPrefix ? `${layoutIdPrefix}-name-${speaker.id}` : undefined}
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
            onClick?.();
          }}
          data-testid={`button-view-bio-${speaker.id}`}
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
  );
}
