import type { SummitHighlight } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Feature cards (e.g. Startup School, Quick Pitch, Demo Stations) with optional call-to-action. */
export function SummitHighlights({ highlights }: { highlights: SummitHighlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {highlights.map((highlight, index) => (
        <Card
          key={`${highlight.title}-${index}`}
          className="h-full hover:shadow-lg transition-shadow w-full max-w-full"
          data-testid={`card-summit-highlight-${index}`}
        >
          <CardContent className="p-3 md:p-4 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-3 text-foreground">{highlight.title}</h3>
            <p className="text-m text-muted-foreground flex-grow whitespace-pre-line">{highlight.description}</p>
            {highlight.ctaUrl && (
              <a href={highlight.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-4">
                <Button size="sm" className="w-full">
                  {highlight.ctaLabel || "Learn more"}
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
