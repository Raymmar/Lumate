import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Renderer, Transform, Vec3, Color, Polyline } from 'ogl';

interface CursorEffectProps {
  className?: string;
}

// Define interface for line object to fix TypeScript errors
interface LineObject {
  spring: number;
  friction: number;
  mouseVelocity: Vec3;
  mouseOffset: Vec3;
  points: Vec3[];
  polyline: Polyline;
  lerpFactor: number;
}

export function CursorEffect({ className }: CursorEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<Transform | null>(null);
  const linesRef = useRef<LineObject[]>([]);
  const mouseRef = useRef(new Vec3());

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WebGL renderer
    const renderer = new Renderer({
      dpr: 2,
      alpha: true,
      stencil: false,
      depth: false,
      antialias: true,
    });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    containerRef.current.appendChild(gl.canvas);

    // Set clear color with transparency
    gl.clearColor(0, 0, 0, 0);

    // Create scene
    const scene = new Transform();
    sceneRef.current = scene;

    // Custom vertex shader for smooth lines
    const vertex = /* glsl */ `
      precision highp float;
      attribute vec3 position;
      attribute vec3 next;
      attribute vec3 prev;
      attribute vec2 uv;
      attribute float side;
      uniform vec2 uResolution;
      uniform float uDPR;
      uniform float uThickness;

      vec4 getPosition() {
        vec4 current = vec4(position, 1);
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1);
        vec2 nextScreen = next.xy * aspect;
        vec2 prevScreen = prev.xy * aspect;

        // Calculate the tangent direction
        vec2 tangent = normalize(nextScreen - prevScreen);
        // Rotate 90 degrees to get the normal
        vec2 normal = vec2(-tangent.y, tangent.x);
        normal /= aspect;

        // Taper the line to be fatter in the middle
        normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));

        // When points are close, shrink the line
        float dist = length(nextScreen - prevScreen);
        normal *= smoothstep(0.0, 0.02, dist);

        float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
        float pixelWidth = current.w * pixelWidthRatio;
        normal *= pixelWidth * uThickness;
        current.xy -= normal * side;

        return current;
      }

      void main() {
        gl_Position = getPosition();
      }
    `;

    // Create lines with different properties and colors
    const colors = [
      '#ec4067',  // Pink (bottom)
      '#000000',  // Black (middle)
      '#FEA30E'   // Primary orange (accent) (top)
    ];

    const properties = [
      { spring: 0.07, friction: 0.84, thickness: 35, offset: 0.12, lerp: 0.82 }, // Pink - medium, more spread
      { spring: 0.05, friction: 0.92, thickness: 30, offset: 0.08, lerp: 0.89 }, // Black - subtle, stays closer
      { spring: 0.09, friction: 0.80, thickness: 40, offset: 0.15, lerp: 0.78 }, // Accent - prominent, most spread
    ];

    colors.forEach((color, i) => {
      const points: Vec3[] = Array.from({ length: 20 }, () => new Vec3());

      const line: LineObject = {
        spring: properties[i].spring,
        friction: properties[i].friction,
        mouseVelocity: new Vec3(),
        mouseOffset: new Vec3(
          random(-1, 1) * properties[i].offset,
          random(-1, 1) * properties[i].offset,
          0
        ),
        points,
        polyline: new Polyline(gl, {
          points,
          vertex,
          uniforms: {
            uColor: { value: new Color(color) },
            uThickness: { value: properties[i].thickness },
          },
        }),
        lerpFactor: properties[i].lerp
      };

      line.polyline.mesh.setParent(scene);
      linesRef.current.push(line);
    });

    // Helper function for random values
    function random(a: number, b: number) {
      const alpha = Math.random();
      return a * (1.0 - alpha) + b * alpha;
    }

    // Handle resize
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      linesRef.current.forEach((line) => line.polyline.resize());
    };
    window.addEventListener('resize', resize, false);
    resize();

    // Handle mouse movement
    const mouse = mouseRef.current;
    const updateMouse = (e: MouseEvent | TouchEvent) => {
      let x, y;
      if ('touches' in e) {
        if (!e.touches.length) return;
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
      } else {
        x = (e as MouseEvent).pageX;
        y = (e as MouseEvent).pageY;
      }

      // Convert mouse position to clip space (-1 to 1)
      mouse.set(
        (x / gl.renderer.width) * 2 - 1,
        (y / gl.renderer.height) * -2 + 1,
        0
      );
    };

    if ('ontouchstart' in window) {
      window.addEventListener('touchstart', updateMouse, false);
      window.addEventListener('touchmove', updateMouse, false);
    } else {
      window.addEventListener('mousemove', updateMouse, false);
    }

    // Animation loop
    const tmp = new Vec3();
    function update() {
      const frame = requestAnimationFrame(update);

      linesRef.current.forEach((line) => {
        // Update polyline input points
        for (let i = line.points.length - 1; i >= 0; i--) {
          if (!i) {
            // First point follows mouse with spring motion
            tmp
              .copy(mouse)
              .add(line.mouseOffset)
              .sub(line.points[i])
              .multiply(line.spring);
            line.mouseVelocity.add(tmp).multiply(line.friction);
            line.points[i].add(line.mouseVelocity);
          } else {
            // Rest of points ease to the point in front of them with custom lerp factor
            line.points[i].lerp(line.points[i - 1], line.lerpFactor);
          }
        }
        line.polyline.updateGeometry();
      });

      renderer.render({ scene });
      return frame;
    }

    const frame = requestAnimationFrame(update);

    // Cleanup
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', updateMouse);
      window.removeEventListener('touchstart', updateMouse);
      window.removeEventListener('touchmove', updateMouse);
      if (containerRef.current && gl.canvas) {
        containerRef.current.removeChild(gl.canvas);
      }
      // Handle cleanup without dispose
      if (rendererRef.current) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 pointer-events-none z-[100]",
        className
      )}
      style={{
        height: '100vh',
        width: '100vw',
      }}
    />
  );
}