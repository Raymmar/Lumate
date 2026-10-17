import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { SponsorPresentation, SponsorTierDefinition } from "@shared/sponsorTiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage, invalidateSponsorQueries } from "./sponsorApi";
import { SPONSOR_TIERS_QUERY_KEY, SPONSOR_PRESENTATIONS, useSponsorTiers } from "./sponsorConfig";
import { TierCatalogStatus } from "./TierCatalogStatus";

const columnOptions = [...new Set(Object.values(SPONSOR_PRESENTATIONS).map((option) => option.cols))];

interface SponsorTierEditorProps {
  tier: SponsorTierDefinition | null;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}

/** Mounted per editing session, so cancel/reopen always starts with fresh fields and errors. */
export function SponsorTierEditor({ tier, onClose, onPendingChange }: SponsorTierEditorProps) {
  const catalog = useSponsorTiers();
  const { toast } = useToast();
  const [name, setName] = useState(tier?.name ?? "");
  const [description, setDescription] = useState(tier?.description ?? "");
  const [position, setPosition] = useState(tier ? String(tier.position) : "");
  const [presentation, setPresentation] = useState<SponsorPresentation>(tier?.presentation ?? "standard");
  const valid = catalog.ready && name.trim().length > 0 && name.trim().length <= 80
    && description.trim().length <= 1000 && position.trim() !== ""
    && Number.isInteger(Number(position)) && Math.abs(Number(position)) <= 1000000;
  const saveTier = useMutation({
    mutationFn: () => {
      const fields = { description: description.trim() || null, position: Number(position), presentation };
      return tier
        ? apiRequest<{ tier: SponsorTierDefinition }>(`/api/sponsor-tiers/${encodeURIComponent(tier.key)}`, "PATCH", fields)
        : apiRequest<{ tier: SponsorTierDefinition }>("/api/sponsor-tiers", "POST", { name: name.trim(), ...fields });
    },
    onMutate: () => onPendingChange(true),
    onSuccess: async ({ tier: saved }) => {
      queryClient.setQueryData<{ tiers: SponsorTierDefinition[] }>(SPONSOR_TIERS_QUERY_KEY, (old) => ({
        tiers: [...(old?.tiers ?? []).filter((item) => item.key !== saved.key), saved],
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SPONSOR_TIERS_QUERY_KEY }),
        invalidateSponsorQueries(),
      ]);
      toast({
        title: tier ? "Tier updated" : "Tier added",
        description: tier ? `${saved.name} updated across all years, including past Summit pages.` : `${saved.name} is now available for sponsorships.`,
      });
    },
    onSettled: (_data, error) => {
      onPendingChange(false);
      if (!error) onClose();
    },
  });

  return (
    <form className="p-6 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (valid && !saveTier.isPending) saveTier.mutate();
    }}>
      <p className="text-sm text-muted-foreground">
        {tier
          ? "Changes affect every year using this tier, including past Summit pages."
          : "Create a tier shared across all sponsorship years. Its name cannot be changed after creation."}
      </p>
      <TierCatalogStatus />
      <fieldset disabled={saveTier.isPending} className="space-y-4">
        {!tier && (
          <div className="space-y-2">
            <Label htmlFor="tier-name">Name *</Label>
            <Input id="tier-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="tier-description">Description</Label>
          <Textarea id="tier-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier-position">Position *</Label>
          <Input id="tier-position" type="number" step="1" min={-1000000} max={1000000} required value={position} onChange={(event) => setPosition(event.target.value)} />
          <p className="text-xs text-muted-foreground">Lower positions display first, across all years.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier-presentation">Columns</Label>
          <Select value={String(SPONSOR_PRESENTATIONS[presentation].cols)} onValueChange={(value) => {
            const selected = (Object.keys(SPONSOR_PRESENTATIONS) as SponsorPresentation[]).find((key) => SPONSOR_PRESENTATIONS[key].cols === Number(value));
            if (selected) setPresentation(selected);
          }} disabled={saveTier.isPending}>
            <SelectTrigger id="tier-presentation"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[10000000]">
              {columnOptions.map((cols) => <SelectItem key={cols} value={String(cols)}>{cols} {cols === 1 ? "column" : "columns"}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Sponsors per row on large screens. Smaller screens use fewer columns.</p>
          {SPONSOR_PRESENTATIONS[presentation].inquiryFiller && (
            <p className="text-xs text-muted-foreground">An unpaired sponsor can have a “Become a Sponsor” card beside it.</p>
          )}
        </div>
      </fieldset>
      {saveTier.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(saveTier.error, "Could not save tier. Please try again.")}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" disabled={saveTier.isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!valid || saveTier.isPending} data-testid="button-save-tier">
          {saveTier.isPending ? "Saving..." : tier ? "Save changes" : "Add tier"}
        </Button>
      </div>
    </form>
  );
}
