import { EyeOff } from "lucide-react";

/** Shown to admins above an empty summit section that visitors don't see yet. */
export function HiddenFromVisitorsNote({ testId }: { testId?: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={testId}>
      <EyeOff className="h-3.5 w-3.5" />
      Only visible to admins until content is added.
    </p>
  );
}
