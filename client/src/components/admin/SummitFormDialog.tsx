import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  LUMA_SUMMIT_FIELDS,
  type LumaSummitField,
  type SummitWithSponsor as Summit,
  type SummitGalleryImage,
  type SummitHighlight,
  type SummitLink,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SponsorPicker } from "@/components/sponsors/SponsorPicker";
import { SponsorModal } from "@/components/sponsors/SponsorModal";
import { apiErrorMessage } from "@/components/sponsors/sponsorApi";
import { LumaFieldHeader, SummitLumaLinkSection, useLumaEventInfo } from "@/components/admin/SummitLumaLink";
import { SUMMITS_QUERY_KEY } from "@/hooks/use-summits";
import { ImageUploadInput } from "@/components/admin/ImageUploadInput";
import { DatePickerInput } from "@/components/admin/DatePickerInput";

type TextFields = {
  title: string;
  tagline: string;
  description: string;
  startDate: string;
  endDate: string;
  dateLabel: string;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string;
  ticketUrl: string;
  photosUrl: string;
  videoEmbedUrl: string;
  heroImage: string;
  logoImage: string;
  dateBlockImage: string;
  seoImage: string;
};

const TEXT_FIELD_KEYS: (keyof TextFields)[] = [
  "title", "tagline", "description", "startDate", "endDate", "dateLabel", "venueName", "venueAddress",
  "venueMapUrl", "ticketUrl", "photosUrl", "videoEmbedUrl", "heroImage", "logoImage", "dateBlockImage",
  "seoImage",
];

/** Site page that sells Summit tickets through Premium membership. */
const MEMBERSHIP_TICKET_PATH = "/memberships";

function emptyText(): TextFields {
  return Object.fromEntries(TEXT_FIELD_KEYS.map((k) => [k, ""])) as TextFields;
}

/** The summit's own saved values. Linked summits arrive merged with Luma, so use `lumaLink.own` for those fields. */
function textFromSummit(summit: Summit): TextFields {
  const own = summit.lumaLink?.own;
  return Object.fromEntries(
    TEXT_FIELD_KEYS.map((k) => {
      const value = own && isLumaField(k) ? own[k] : summit[k];
      return [k, value ?? ""];
    }),
  ) as TextFields;
}

function isLumaField(key: string): key is LumaSummitField {
  return (LUMA_SUMMIT_FIELDS as readonly string[]).includes(key);
}

interface SummitFormDialogProps {
  /** Summit to edit; null creates a new year. */
  summit: Summit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suggested year for a new summit */
  suggestedYear: number;
}

export function SummitFormDialog({ summit, open, onOpenChange, suggestedYear }: SummitFormDialogProps) {
  const { toast } = useToast();
  const [year, setYear] = useState(String(suggestedYear));
  const [text, setText] = useState<TextFields>(emptyText);
  const [isPublished, setIsPublished] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(true);
  const [links, setLinks] = useState<SummitLink[]>([]);
  const [highlights, setHighlights] = useState<SummitHighlight[]>([]);
  const [gallery, setGallery] = useState<SummitGalleryImage[]>([]);
  const [presentingSponsorId, setPresentingSponsorId] = useState<number | null>(null);
  // Old free-text "Presented by" (shown only when no sponsor is linked); can be cleared
  const [legacyPresenterCleared, setLegacyPresenterCleared] = useState(false);
  const [newSponsorName, setNewSponsorName] = useState<string | null>(null);
  const [lumaEventApiId, setLumaEventApiId] = useState<string | null>(null);
  const [lumaOverrides, setLumaOverrides] = useState<LumaSummitField[]>([]);
  const savedLumaLink = summit?.lumaLink;
  const luma = useLumaEventInfo(lumaEventApiId, savedLumaLink);
  const initialPresentingSponsorId = summit?.presentingSponsorId ?? null;
  const legacyPresenter =
    summit && !summit.presentingSponsorId && summit.presentedByName && !legacyPresenterCleared
      ? summit.presentedByName
      : null;

  useEffect(() => {
    if (!open) return;
    if (summit) {
      setYear(String(summit.year));
      setText(textFromSummit(summit));
      setIsPublished(summit.isPublished);
      setShowLearnMore(summit.showLearnMore ?? true);
      setLinks(summit.links ?? []);
      setHighlights(summit.highlights ?? []);
      setGallery(summit.galleryImages ?? []);
      setPresentingSponsorId(summit.presentingSponsorId ?? null);
      setLumaEventApiId(summit.lumaEventApiId ?? null);
      setLumaOverrides(summit.lumaOverrides ?? []);
    } else {
      setYear(String(suggestedYear));
      setText({ ...emptyText(), title: "Sarasota Tech Summit" });
      setIsPublished(false);
      setShowLearnMore(true);
      setLinks([]);
      setHighlights([]);
      setGallery([]);
      setPresentingSponsorId(null);
      setLumaEventApiId(null);
      setLumaOverrides([]);
    }
    setLegacyPresenterCleared(false);
    setNewSponsorName(null);
  }, [open, summit, suggestedYear]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        year: parseInt(year, 10),
        ...Object.fromEntries(TEXT_FIELD_KEYS.map((k) => [k, text[k].trim() || null])),
        title: text.title.trim(),
        isPublished,
        showLearnMore,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
        highlights: highlights.filter((h) => h.title.trim()),
        galleryImages: gallery.filter((g) => g.src.trim()),
        lumaEventApiId,
        lumaOverrides: lumaEventApiId ? lumaOverrides : [],
        // Only send the presenting sponsor when it changed; null also clears the old text fallback
        ...(presentingSponsorId !== initialPresentingSponsorId
          ? { presentingSponsorId }
          : legacyPresenterCleared
            ? { presentingSponsorId: null }
            : {}),
      };
      return summit
        ? apiRequest<{ summit: Summit }>(`/api/summits/${summit.id}`, "PATCH", payload)
        : apiRequest<{ summit: Summit }>("/api/summits", "POST", payload);
    },
    onSuccess: ({ summit: saved }) => {
      // Put the saved summit (with its Luma link details) in the cache right away so
      // reopening the dialog shows it without waiting for the refetch
      queryClient.setQueryData<{ summits: Summit[] }>(SUMMITS_QUERY_KEY, (old) => {
        if (!old) return old;
        const others = old.summits.filter((s) => s.id !== saved.id);
        return { summits: [...others, saved].sort((a, b) => b.year - a.year) };
      });
      queryClient.setQueryData(["/api/summits", saved.year], saved);
      queryClient.invalidateQueries({ queryKey: ["/api/summits"] });
      // Choosing a presenting sponsor may have added them to that year's sponsors
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/sponsors"),
      });
      toast({ title: summit ? "Summit updated" : "Summit created" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't save summit",
        description: apiErrorMessage(error, "Failed to save summit"),
        variant: "destructive",
      });
    },
  });

  const setOverride = (key: LumaSummitField, overridden: boolean) => {
    setLumaOverrides((current) => (overridden ? [...current, key] : current.filter((k) => k !== key)));
    // Start a new override from the Luma value rather than an empty box
    const lumaValue = luma.values?.[key];
    if (overridden && lumaValue && !text[key].trim()) setText((t) => ({ ...t, [key]: lumaValue }));
  };

  // The ticket link visitors get: Luma's unless overridden on a linked summit
  const ticketFromLuma = luma.values != null && !lumaOverrides.includes("ticketUrl");
  const effectiveTicketUrl = ticketFromLuma ? (luma.values?.ticketUrl ?? "") : text.ticketUrl;
  const applyMembershipTickets = () => {
    if (ticketFromLuma) setLumaOverrides((current) => [...current, "ticketUrl"]);
    setText((t) => ({ ...t, ticketUrl: MEMBERSHIP_TICKET_PATH }));
  };

  const unlinkLuma = (copyValues: boolean) => {
    if (copyValues && luma.values) {
      const values = luma.values;
      setText((t) => {
        const next = { ...t };
        for (const key of LUMA_SUMMIT_FIELDS) {
          if (!lumaOverrides.includes(key)) next[key] = values[key] ?? "";
        }
        return next;
      });
    }
    setLumaEventApiId(null);
    setLumaOverrides([]);
  };

  const field = (
    key: keyof TextFields,
    label: string,
    opts: { placeholder?: string; multiline?: boolean; hint?: string; kind?: "image" | "date" | "url" } = {},
  ) => {
    const id = `summit-${key}`;
    // Luma supplies this field: show its value read-only unless overridden
    const fromLuma = isLumaField(key) && luma.values != null;
    const overridden = isLumaField(key) && lumaOverrides.includes(key);
    const readOnly = fromLuma && !overridden;
    const value = readOnly ? (luma.values![key as LumaSummitField] ?? "") : text[key];
    const placeholder = readOnly ? "Not set in Luma" : opts.placeholder;
    const onChange = (v: string) => setText((t) => ({ ...t, [key]: v }));
    return (
      <div className="space-y-1">
        {fromLuma ? (
          <LumaFieldHeader
            htmlFor={id}
            label={label}
            overridden={overridden}
            onOverrideChange={(next) => setOverride(key as LumaSummitField, next)}
            testId={key}
          />
        ) : (
          <Label htmlFor={id}>{label}</Label>
        )}
        {opts.kind === "image" ? (
          <ImageUploadInput
            id={id}
            value={value}
            placeholder={placeholder}
            readOnly={readOnly}
            className={readOnly ? "bg-muted text-muted-foreground" : undefined}
            onChange={onChange}
            data-testid={`input-summit-${key}`}
          />
        ) : opts.kind === "date" ? (
          <DatePickerInput
            id={id}
            value={value}
            placeholder={readOnly ? placeholder : undefined}
            readOnly={readOnly}
            className={readOnly ? "bg-muted text-muted-foreground" : undefined}
            onChange={onChange}
            data-testid={`input-summit-${key}`}
          />
        ) : opts.multiline ? (
          <Textarea
            id={id}
            value={value}
            placeholder={placeholder}
            readOnly={readOnly}
            className={readOnly ? "bg-muted text-muted-foreground" : undefined}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            data-testid={`input-summit-${key}`}
          />
        ) : (
          <Input
            id={id}
            type={opts.kind === "url" ? "url" : undefined}
            value={value}
            placeholder={placeholder}
            readOnly={readOnly}
            className={readOnly ? "bg-muted text-muted-foreground" : undefined}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`input-summit-${key}`}
          />
        )}
        {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the form body scrolls, so the Save button stays visible */}
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{summit ? `Edit ${summit.year} Summit` : "New Summit Year"}</DialogTitle>
          <DialogDescription>Details, images and content for this year's summit page.</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-1 pb-2">
          <SummitLumaLinkSection
            apiId={lumaEventApiId}
            info={luma}
            savedTitle={savedLumaLink?.event?.title}
            enabled={open}
            onLink={setLumaEventApiId}
            onUnlink={unlinkLuma}
          />

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Event details</h3>
            <div className="space-y-1">
              <Label htmlFor="summit-year">Year</Label>
              <Input
                id="summit-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                data-testid="input-summit-year"
              />
            </div>
            {field("title", "Title")}
            {field("tagline", "Tagline", { placeholder: "One Day Mini-Conf & Startup Fair" })}
            {field("startDate", "Start date", { kind: "date" })}
            {field("endDate", "End date (optional)", { kind: "date" })}
            <div className="sm:col-span-2">
              {field("dateLabel", "Date label (optional)", {
                placeholder: "January 15th, 2026",
                hint: luma.values
                  ? "Replaces the displayed dates. Leave empty to show the Luma dates."
                  : "Replaces the displayed dates. Leave empty to show the dates above.",
              })}
            </div>
            <div className="sm:col-span-2">{field("description", "Description", { multiline: true })}</div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Venue & tickets</h3>
            {field("venueName", "Venue name")}
            {field("venueAddress", "Venue address")}
            {field("venueMapUrl", "Map link", { kind: "url", placeholder: "https://..." })}
            <div className="space-y-1">
              {field("ticketUrl", "Ticket / event link", {
                placeholder: "https://... or /memberships",
                hint: "Use /memberships to sell tickets through Premium membership. Site links open in the same tab.",
              })}
              {effectiveTicketUrl.trim() !== MEMBERSHIP_TICKET_PATH && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={applyMembershipTickets}
                  data-testid="button-summit-ticket-memberships"
                >
                  Sell tickets through membership
                </Button>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="summit-show-learn-more">Show Learn more button</Label>
                <p className="text-sm text-muted-foreground">
                  Link to this year's annual page from the main Summit page. Turn off for a save-the-date.
                </p>
              </div>
              <Switch
                id="summit-show-learn-more"
                checked={showLearnMore}
                onCheckedChange={setShowLearnMore}
                data-testid="switch-summit-show-learn-more"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="summit-presenting-sponsor">Presenting sponsor</Label>
              <SponsorPicker
                id="summit-presenting-sponsor"
                value={presentingSponsorId}
                onChange={(sponsor) => {
                  setPresentingSponsorId(sponsor?.id ?? null);
                  if (!sponsor) setLegacyPresenterCleared(true);
                }}
                onCreateNew={(name) => setNewSponsorName(name)}
                allowClear
                placeholder="No presenting sponsor"
              />
              {legacyPresenter && presentingSponsorId === null ? (
                <p className="text-xs text-muted-foreground">
                  Currently shows "{legacyPresenter}" as plain text. Pick a sponsor to link it, or{" "}
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => setLegacyPresenterCleared(true)}
                    data-testid="button-clear-legacy-presenter"
                  >
                    remove it
                  </button>
                  .
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Shown as "Presented by" with the sponsor's current name and link. They're also added to this
                  year's sponsors if they aren't already.
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Images</h3>
            {field("heroImage", "Hero image", { kind: "image", hint: "Fills the left side of the page header." })}
            {field("seoImage", "Social share image", { kind: "image", hint: "Shown when the page link is shared." })}
            {field("logoImage", "Logo overlay (optional)", {
              kind: "image",
              hint: "Placed over the top-left of the hero image. Not shown if empty.",
            })}
            {field("dateBlockImage", "Date block image (optional)", {
              kind: "image",
              hint: "Decorative graphic at the bottom-right of the hero image. Not shown if empty.",
            })}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Page content</h3>
            {field("photosUrl", "Photo album link", { kind: "url", placeholder: "https://..." })}
            {field("videoEmbedUrl", "Video link", {
              kind: "url",
              placeholder: "https://www.youtube.com/watch?v=...",
              hint: "A YouTube link or embed link.",
            })}
          </section>

          <RowListEditor
            title="Event links"
            rows={links}
            onChange={setLinks}
            empty={{ label: "", url: "" }}
            columns={[
              { key: "label", placeholder: "Label" },
              { key: "url", placeholder: "https://..." },
            ]}
          />

          <RowListEditor
            title="Highlight cards"
            rows={highlights}
            onChange={setHighlights}
            empty={{ title: "", description: "", ctaLabel: "", ctaUrl: "" }}
            columns={[
              { key: "title", placeholder: "Title" },
              { key: "description", placeholder: "Description", multiline: true },
              { key: "ctaLabel", placeholder: "Button label" },
              { key: "ctaUrl", placeholder: "Button link" },
            ]}
          />

          <RowListEditor
            title="Gallery images"
            rows={gallery}
            onChange={setGallery}
            empty={{ src: "", alt: "", title: "" }}
            columns={[
              { key: "src", placeholder: "Image URL", image: true },
              { key: "alt", placeholder: "Alt text" },
              { key: "title", placeholder: "Caption" },
            ]}
          />

          </div>

          <DialogFooter className="items-center gap-2 border-t pt-4 sm:justify-between">
            <div className="flex items-center gap-3 mr-auto">
              <Switch id="summit-published" checked={isPublished} onCheckedChange={setIsPublished} data-testid="switch-summit-published" />
              <Label htmlFor="summit-published">Published (visible to the public)</Label>
            </div>
            <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-summit">
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {summit ? "Save changes" : "Create summit"}
            </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      {newSponsorName !== null && (
        <SponsorModal
          sponsor={null}
          initialName={newSponsorName}
          onClose={() => setNewSponsorName(null)}
          onSaved={(sponsor) => setPresentingSponsorId(sponsor.id)}
        />
      )}
    </Dialog>
  );
}

interface RowListEditorProps<T extends Record<string, string | undefined>> {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  empty: T;
  columns: { key: keyof T & string; placeholder: string; multiline?: boolean; image?: boolean }[];
}

function RowListEditor<T extends Record<string, string | undefined>>({ title, rows, onChange, empty, columns }: RowListEditorProps<T>) {
  const update = (index: number, key: keyof T, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { ...empty }])}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2 items-start border rounded-md p-2">
          <div className="grid gap-2 flex-1 sm:grid-cols-2">
            {columns.map((col) =>
              col.image ? (
                <div key={col.key} className="sm:col-span-2">
                  <ImageUploadInput
                    value={row[col.key] ?? ""}
                    placeholder={col.placeholder}
                    onChange={(url) => update(index, col.key, url)}
                  />
                </div>
              ) : col.multiline ? (
                <Textarea
                  key={col.key}
                  className="sm:col-span-2"
                  rows={2}
                  placeholder={col.placeholder}
                  value={row[col.key] ?? ""}
                  onChange={(e) => update(index, col.key, e.target.value)}
                />
              ) : (
                <Input
                  key={col.key}
                  placeholder={col.placeholder}
                  value={row[col.key] ?? ""}
                  onChange={(e) => update(index, col.key, e.target.value)}
                />
              ),
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </section>
  );
}
