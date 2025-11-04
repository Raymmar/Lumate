import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export function TruncatedText({ text, maxLines = 3, className = "" }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current && !isExpanded) {
        const element = textRef.current;
        const overflow = element.scrollHeight > element.clientHeight;
        setHasOverflow(overflow);
      }
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(() => {
      checkTruncation();
    });

    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [text, isExpanded, maxLines]);

  if (!text) return null;

  return (
    <div className={className}>
      <p 
        ref={textRef}
        className="text-muted-foreground whitespace-pre-wrap break-words"
        style={!isExpanded ? {
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        } : undefined}
      >
        {text}
      </p>
      {hasOverflow && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto p-0 mt-1 text-sm"
          data-testid={isExpanded ? "button-read-less" : "button-read-more"}
        >
          {isExpanded ? "Read Less" : "Read More"}
        </Button>
      )}
    </div>
  );
}
