import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { LumaSummitValues, SummitLumaLink } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EventSelect } from "@/components/admin/EventSelect";

export type LumaEventInfo = {
  event: SummitLumaLink["event"];
  values: LumaSummitValues | null;
  broken: boolean;
  isLoading: boolean;
};

/**
 * Luma details for the event selected in the form: the saved link's details when
 * unchanged, otherwise a preview of the newly chosen event.
 */
export function useLumaEventInfo(apiId: string | null, saved: SummitLumaLink | undefined): LumaEventInfo {
  const useSaved = apiId != null && saved?.apiId === apiId;
  const preview = useQuery<{ event: NonNullable<SummitLumaLink["event"]>; values: LumaSummitValues } | null>({
    queryKey: ["/api/summits/luma-preview", apiId],
    enabled: apiId != null && !useSaved,
    queryFn: async () => {
      const res = await fetch(`/api/summits/luma-preview/${encodeURIComponent(apiId!)}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load Luma event");
      return res.json();
    },
  });
  if (apiId == null) return { event: null, values: null, broken: false, isLoading: false };
  if (useSaved) return { event: saved.event, values: saved.values, broken: saved.broken, isLoading: false };
  return {
    event: preview.data?.event ?? null,
    values: preview.data?.values ?? null,
    broken: preview.isSuccess && preview.data === null,
    isLoading: preview.isLoading,
  };
}

function formatEventDate(startTime: string, timezone: string | null): string {
  const date = new Date(startTime);
  try {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone ?? undefined,
    });
  } catch {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
}

interface SummitLumaLinkSectionProps {
  apiId: string | null;
  info: LumaEventInfo;
  /** Title of the saved event, used if it's no longer in the recent events list */
  savedTitle?: string;
  enabled: boolean;
  onLink: (apiId: string) => void;
  /** Unlink; `copyValues` copies the current Luma values into the summit's own fields first */
  onUnlink: (copyValues: boolean) => void;
}

/** "Luma event" picker at the top of the summit form, with link status and the unlink prompt. */
export function SummitLumaLinkSection({ apiId, info, savedTitle, enabled, onLink, onUnlink }: SummitLumaLinkSectionProps) {
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  return (
    <section className="space-y-2 rounded-md border p-4" data-testid="section-summit-luma">
      <Label htmlFor="summit-luma-event">Luma event</Label>
      <EventSelect
        id="summit-luma-event"
        value={apiId}
        onChange={(next) => {
          if (next) return onLink(next);
          // Nothing to copy from a broken or still-loading link
          if (info.values) setConfirmUnlink(true);
          else onUnlink(false);
        }}
        noneLabel="Not linked (enter details by hand)"
        missingLabel={info.event?.title ?? savedTitle ?? "Missing Luma event"}
        enabled={enabled}
        data-testid="select-summit-luma-event"
      />
      {apiId == null ? (
        <p className="text-xs text-muted-foreground">
          Link a synced Luma event to fill in the dates, description, venue, ticket link and share image from Luma.
        </p>
      ) : info.broken ? (
        <Alert variant="destructive" data-testid="alert-summit-luma-broken">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The linked Luma event isn't in the synced events anymore, so the page uses this summit's own saved values
            below. Pick another event or unlink it.
          </AlertDescription>
        </Alert>
      ) : info.event ? (
        <p className="text-xs text-muted-foreground" data-testid="text-summit-luma-linked">
          Linked to <span className="font-medium text-foreground">{info.event.title}</span> (
          {formatEventDate(info.event.startTime, info.event.timezone)}). Fields marked "From Luma" update after each
          Luma sync.{" "}
          {info.event.url && (
            <a href={info.event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center underline">
              Open in Luma <ExternalLink className="ml-0.5 h-3 w-3" />
            </a>
          )}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Loading Luma event…</p>
      )}

      <AlertDialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink the Luma event?</AlertDialogTitle>
            <AlertDialogDescription>
              Copy the current Luma values (dates, description, venue, ticket link, share image) into this summit's own
              fields so the page keeps showing them? Otherwise the summit's own saved values are used.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-unlink-cancel">Keep linked</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmUnlink(false);
                onUnlink(false);
              }}
              data-testid="button-unlink-keep-own"
            >
              Use summit's own values
            </Button>
            <AlertDialogAction onClick={() => onUnlink(true)} data-testid="button-unlink-copy">
              Copy Luma values
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

interface LumaFieldHeaderProps {
  htmlFor: string;
  label: string;
  overridden: boolean;
  onOverrideChange: (overridden: boolean) => void;
  testId: string;
}

/** Label row for a field Luma supplies: "From Luma" badge plus an Override switch. */
export function LumaFieldHeader({ htmlFor, label, overridden, onOverrideChange, testId }: LumaFieldHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {!overridden && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0" data-testid={`badge-from-luma-${testId}`}>
            From Luma
          </Badge>
        )}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Override
        <Switch
          checked={overridden}
          onCheckedChange={onOverrideChange}
          className="scale-75"
          data-testid={`switch-override-${testId}`}
        />
      </label>
    </div>
  );
}
