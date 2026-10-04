import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { SummitWithSponsor as Summit, SummitGalleryImage, SummitHighlight, SummitLink } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SponsorPicker } from "@/components/sponsors/SponsorPicker";
import { SponsorModal } from "@/components/sponsors/SponsorModal";
import { apiErrorMessage } from "@/components/sponsors/sponsorApi";

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

function emptyText(): TextFields {
  return Object.fromEntries(TEXT_FIELD_KEYS.map((k) => [k, ""])) as TextFields;
}

function textFromSummit(summit: Summit): TextFields {
  return Object.fromEntries(TEXT_FIELD_KEYS.map((k) => [k, summit[k] ?? ""])) as TextFields;
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
  const [links, setLinks] = useState<SummitLink[]>([]);
  const [highlights, setHighlights] = useState<SummitHighlight[]>([]);
  const [gallery, setGallery] = useState<SummitGalleryImage[]>([]);
  const [presentingSponsorId, setPresentingSponsorId] = useState<number | null>(null);
  // Old free-text "Presented by" (shown only when no sponsor is linked); can be cleared
  const [legacyPresenterCleared, setLegacyPresenterCleared] = useState(false);
  const [newSponsorName, setNewSponsorName] = useState<string | null>(null);
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
      setLinks(summit.links ?? []);
      setHighlights(summit.highlights ?? []);
      setGallery(summit.galleryImages ?? []);
      setPresentingSponsorId(summit.presentingSponsorId ?? null);
    } else {
      setYear(String(suggestedYear));
      setText({ ...emptyText(), title: "Sarasota Tech Summit" });
      setIsPublished(false);
      setLinks([]);
      setHighlights([]);
      setGallery([]);
      setPresentingSponsorId(null);
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
        links: links.filter((l) => l.label.trim() && l.url.trim()),
        highlights: highlights.filter((h) => h.title.trim()),
        galleryImages: gallery.filter((g) => g.src.trim()),
        // Only send the presenting sponsor when it changed; null also clears the old text fallback
        ...(presentingSponsorId !== initialPresentingSponsorId
          ? { presentingSponsorId }
          : legacyPresenterCleared
            ? { presentingSponsorId: null }
            : {}),
      };
      return summit
        ? apiRequest(`/api/summits/${summit.id}`, "PATCH", payload)
        : apiRequest("/api/summits", "POST", payload);
    },
    onSuccess: () => {
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

  const field = (key: keyof TextFields, label: string, opts: { placeholder?: string; multiline?: boolean } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`summit-${key}`}>{label}</Label>
      {opts.multiline ? (
        <Textarea
          id={`summit-${key}`}
          value={text[key]}
          placeholder={opts.placeholder}
          onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
          rows={3}
        />
      ) : (
        <Input
          id={`summit-${key}`}
          value={text[key]}
          placeholder={opts.placeholder}
          onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
          data-testid={`input-summit-${key}`}
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{summit ? `Edit ${summit.year} Summit` : "New Summit Year"}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <section className="grid gap-4 sm:grid-cols-2">
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
            {field("dateLabel", "Date label (optional)", { placeholder: "January 15th, 2026" })}
            {field("startDate", "Start date", { placeholder: "YYYY-MM-DD" })}
            {field("endDate", "End date (optional)", { placeholder: "YYYY-MM-DD" })}
            <div className="sm:col-span-2">{field("description", "Description", { multiline: true })}</div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="sm:col-span-2 font-semibold">Venue & links</h3>
            {field("venueName", "Venue name")}
            {field("venueAddress", "Venue address")}
            {field("venueMapUrl", "Map link")}
            {field("ticketUrl", "Ticket / event link")}
            {field("photosUrl", "Photo album link")}
            {field("videoEmbedUrl", "Video embed URL", { placeholder: "https://www.youtube.com/embed/..." })}
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
            {field("heroImage", "Hero image URL")}
            {field("logoImage", "Logo overlay URL")}
            {field("dateBlockImage", "Date block image URL")}
            {field("seoImage", "Social share image URL")}
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
              { key: "src", placeholder: "Image URL" },
              { key: "alt", placeholder: "Alt text" },
              { key: "title", placeholder: "Caption" },
            ]}
          />

          <div className="flex items-center gap-3">
            <Switch id="summit-published" checked={isPublished} onCheckedChange={setIsPublished} data-testid="switch-summit-published" />
            <Label htmlFor="summit-published">Published (visible to the public)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-summit">
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {summit ? "Save changes" : "Create summit"}
            </Button>
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
  columns: { key: keyof T & string; placeholder: string; multiline?: boolean }[];
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
              col.multiline ? (
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
