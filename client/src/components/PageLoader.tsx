import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Fallback shown while a page's code is downloading on a fresh load.
 * The spinner waits a moment before appearing, so fast loads show nothing at all.
 */
export function PageLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      {visible && (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading page</span>
        </>
      )}
    </div>
  );
}
