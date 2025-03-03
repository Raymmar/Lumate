import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorEffectProps {
  className?: string;
}

export function CursorEffect({ className }: CursorEffectProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      const now = Date.now();
      setPosition({ x: e.clientX, y: e.clientY });

      // Update trail more frequently for better consistency
      if (now - lastUpdate > 30) { // Reduced delay for more frequent updates
        setTrail(prev => [
          ...prev,
          { x: e.clientX, y: e.clientY, id: now }
        ].slice(-40)); // Increased trail length significantly
        setLastUpdate(now);
      }
    };

    const handleClick = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 800); // Longer animation duration
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('click', handleClick);
    };
  }, [lastUpdate]);

  return (
    <div 
      className={cn(
        "fixed inset-0 pointer-events-none z-0",
        "overflow-hidden",
        className
      )}
    >
      {/* Main cursor */}
      <div
        className={cn(
          "absolute w-16 h-16 rounded-full", // Much larger cursor
          "bg-[#FEA30E]/50 dark:bg-[#FEA30E]/60", // Significantly increased opacity
          "blur-2xl transition-all duration-200 ease-out", // Enhanced blur effect
          clicked && "scale-[2]" // More dramatic scale effect
        )}
        style={{
          transform: `translate(${position.x - 32}px, ${position.y - 32}px)`,
        }}
      />

      {/* Trail effect */}
      {trail.map((point, i) => (
        <div
          key={point.id}
          className={cn(
            "absolute w-10 h-10 rounded-full", // Larger trail points
            "bg-[#FEA30E]/40 dark:bg-[#FEA30E]/50", // More visible trail
            "blur-xl transition-all duration-500" // Enhanced blur and longer duration
          )}
          style={{
            transform: `translate(${point.x - 20}px, ${point.y - 20}px)`,
            opacity: 1 - (i / trail.length) * 0.6, // More gradual fade for longer visible trail
          }}
        />
      ))}

      {/* Click burst effect */}
      {clicked && (
        <div
          className={cn(
            "absolute w-48 h-48 rounded-full", // Much larger burst
            "bg-[#FEA30E]/60 dark:bg-[#FEA30E]/70", // More intense burst
            "blur-2xl animate-ping" // Enhanced blur effect
          )}
          style={{
            transform: `translate(${position.x - 96}px, ${position.y - 96}px)`,
          }}
        />
      )}
    </div>
  );
}