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
      // Calculate position including scroll offset
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;

      setPosition({ x, y });

      // Update trail with scroll-adjusted coordinates
      if (now - lastUpdate > 30) {
        setTrail(prev => [
          ...prev,
          { x, y, id: now }
        ].slice(-40));
        setLastUpdate(now);
      }
    };

    const handleClick = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 800);
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
        "absolute inset-0 pointer-events-none z-[100]",
        "min-h-[100vh]", 
        className
      )}
      style={{
        height: '100%',
        minHeight: '100vh',
      }}
    >
      {/* Main cursor */}
      <div
        className={cn(
          "absolute w-16 h-16 rounded-full",
          "bg-[#FEA30E]/50 dark:bg-[#FEA30E]/60",
          "blur-2xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          clicked && "scale-[2]"
        )}
        style={{
          transform: `translate(${position.x - 32}px, ${position.y - 32}px)`,
          willChange: 'transform', 
        }}
      />

      {/* Trail effect */}
      {trail.map((point, i) => (
        <div
          key={point.id}
          className={cn(
            "absolute w-10 h-10 rounded-full",
            "bg-[#FEA30E]/40 dark:bg-[#FEA30E]/50",
            "blur-xl transition-all duration-500"
          )}
          style={{
            transform: `translate(${point.x - 20}px, ${point.y - 20}px)`,
            opacity: 1 - (i / trail.length) * 0.6,
            transition: `all 500ms cubic-bezier(0.4,0,0.2,1) ${i * 8}ms`,
            willChange: 'transform, opacity', 
          }}
        />
      ))}

      {/* Click burst effect */}
      {clicked && (
        <div
          className={cn(
            "absolute w-48 h-48 rounded-full",
            "bg-[#FEA30E]/60 dark:bg-[#FEA30E]/70",
            "blur-2xl animate-ping"
          )}
          style={{
            transform: `translate(${position.x - 96}px, ${position.y - 96}px)`,
            willChange: 'transform', 
          }}
        />
      )}
    </div>
  );
}