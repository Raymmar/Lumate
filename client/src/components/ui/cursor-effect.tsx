import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface CursorEffectProps {
  className?: string;
}

export function CursorEffect({ className }: CursorEffectProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const [lastUpdate, setLastUpdate] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      const now = Date.now();
      // Calculate position including scroll offset
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;

      // Update the target position immediately
      setActualPosition({ x, y });

      // Update trail with scroll-adjusted coordinates
      if (now - lastUpdate > 40) { // Slightly increased delay for smoother trail
        setTrail(prev => [
          ...prev,
          { x, y, id: now }
        ].slice(-35)); // Reduced trail length slightly
        setLastUpdate(now);
      }
    };

    const handleClick = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 800);
    };

    // Smooth animation loop
    const animate = () => {
      setPosition(prev => {
        const dx = actualPosition.x - prev.x;
        const dy = actualPosition.y - prev.y;

        // Smooth follow with spring-like motion
        return {
          x: prev.x + dx * 0.08, // Reduced speed factor for smoother following
          y: prev.y + dy * 0.08
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('click', handleClick);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [actualPosition, lastUpdate]);

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
          "blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.34, 1.56, 0.64, 1)]", // Enhanced easing curve
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
            "blur-xl"
          )}
          style={{
            transform: `translate(${point.x - 20}px, ${point.y - 20}px)`,
            opacity: 1 - (i / trail.length) * 0.6,
            transition: `all 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 10}ms`, // Enhanced timing and easing
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