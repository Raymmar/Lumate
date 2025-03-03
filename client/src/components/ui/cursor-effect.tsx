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
      // Update position more frequently for smoother movement
      setPosition({ x: e.clientX, y: e.clientY });

      // Add trail points with controlled timing for consistency
      if (now - lastUpdate > 50) { // Adjust timing for trail consistency
        setTrail(prev => [
          ...prev,
          { x: e.clientX, y: e.clientY, id: now }
        ].slice(-30)); // Increased trail length for better visibility
        setLastUpdate(now);
      }
    };

    const handleClick = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 600); // Slightly longer animation
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
          "absolute w-10 h-10 rounded-full", // Slightly larger cursor
          "bg-[#FEA30E]/30 dark:bg-[#FEA30E]/40", // More prominent base opacity
          "blur-xl transition-all duration-200 ease-out", // Smoother transition
          clicked && "scale-150"
        )}
        style={{
          transform: `translate(${position.x - 20}px, ${position.y - 20}px)`,
        }}
      />

      {/* Trail effect */}
      {trail.map((point, i) => (
        <div
          key={point.id}
          className={cn(
            "absolute w-6 h-6 rounded-full", // Larger trail points
            "bg-[#FEA30E]/20 dark:bg-[#FEA30E]/30", // More visible trail
            "blur-lg transition-all duration-300" // Smoother trail animation
          )}
          style={{
            transform: `translate(${point.x - 12}px, ${point.y - 12}px)`,
            opacity: 1 - (i / trail.length) * 0.8, // More gradual fade
          }}
        />
      ))}

      {/* Click burst effect */}
      {clicked && (
        <div
          className={cn(
            "absolute w-32 h-32 rounded-full", // Larger burst
            "bg-[#FEA30E]/40 dark:bg-[#FEA30E]/50", // More prominent burst
            "blur-xl animate-ping" // Keep the ping animation
          )}
          style={{
            transform: `translate(${position.x - 64}px, ${position.y - 64}px)`,
          }}
        />
      )}
    </div>
  );
}