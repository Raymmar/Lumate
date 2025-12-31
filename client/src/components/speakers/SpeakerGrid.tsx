import { useState } from "react";
import { Speaker } from "@shared/schema";
import { SpeakerCard, SpeakerWithPresentation } from "./SpeakerCard";
import { SpeakerDetailModal } from "./SpeakerDetailModal";

interface SpeakerGridProps {
  speakers: SpeakerWithPresentation[];
  variant?: "compact" | "expanded";
  columns?: 2 | 3 | 4;
  layoutIdPrefix?: string;
}

export function SpeakerGrid({ 
  speakers, 
  variant = "expanded",
  columns = 3,
  layoutIdPrefix = "grid"
}: SpeakerGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedSpeaker = selectedIndex !== null ? speakers[selectedIndex] : null;

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < speakers.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const gridColsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  if (variant === "compact") {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {speakers.map((speaker, index) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              variant="compact"
              onClick={() => setSelectedIndex(index)}
              layoutIdPrefix={`${layoutIdPrefix}-${speaker.id}`}
            />
          ))}
        </div>
        <SpeakerDetailModal
          speaker={selectedSpeaker}
          isOpen={selectedIndex !== null}
          onClose={() => setSelectedIndex(null)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={selectedIndex !== null && selectedIndex > 0}
          hasNext={selectedIndex !== null && selectedIndex < speakers.length - 1}
        />
      </>
    );
  }

  return (
    <>
      <div className={`grid ${gridColsClass} gap-4`}>
        {speakers.map((speaker, index) => (
          <SpeakerCard
            key={speaker.id}
            speaker={speaker}
            variant="expanded"
            onClick={() => setSelectedIndex(index)}
            layoutIdPrefix={`${layoutIdPrefix}-${speaker.id}`}
          />
        ))}
      </div>
      <SpeakerDetailModal
        speaker={selectedSpeaker}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={selectedIndex !== null && selectedIndex > 0}
        hasNext={selectedIndex !== null && selectedIndex < speakers.length - 1}
      />
    </>
  );
}
