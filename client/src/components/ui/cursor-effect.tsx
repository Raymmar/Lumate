import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorEffectProps {
  className?: string;
}

export function CursorEffect({ className }: CursorEffectProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setTrail(prev => [...prev, { x: e.clientX, y: e.clientY, id: Date.now() }]
        .slice(-20)); // Keep last 20 positions for trail
    };

    const handleClick = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 500);
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('click', handleClick);
    };
  }, []);

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
          "absolute w-8 h-8 rounded-full",
          "bg-[#FEA30E]/20 dark:bg-[#FEA30E]/30",
          "blur-xl transition-transform duration-100 ease-out",
          clicked && "scale-150"
        )}
        style={{
          transform: `translate(${position.x - 16}px, ${position.y - 16}px)`,
        }}
      />

      {/* Trail effect */}
      {trail.map((point, i) => (
        <div
          key={point.id}
          className={cn(
            "absolute w-4 h-4 rounded-full",
            "bg-[#FEA30E]/10 dark:bg-[#FEA30E]/20",
            "blur-md transition-opacity duration-500"
          )}
          style={{
            transform: `translate(${point.x - 8}px, ${point.y - 8}px)`,
            opacity: 1 - (i / trail.length),
          }}
        />
      ))}

      {/* Click burst effect */}
      {clicked && (
        <div
          className={cn(
            "absolute w-24 h-24 rounded-full",
            "bg-[#FEA30E]/30 dark:bg-[#FEA30E]/40",
            "blur-xl animate-ping"
          )}
          style={{
            transform: `translate(${position.x - 48}px, ${position.y - 48}px)`,
          }}
        />
      )}
    </div>
  );
}
