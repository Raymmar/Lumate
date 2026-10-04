import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { SponsorWithHistory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SPONSOR_TIERS } from "./sponsorConfig";
import { SponsorPicker } from "./SponsorPicker";
import { apiErrorMessage, invalidateSponsorQueries } from "./sponsorApi";

function TierSelect({ id, value, onChange }: { id: string; value: string; onChange: (tier: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} data-testid="select-sponsorship-tier">
        <SelectValue placeholder="Select a tier" />
      </SelectTrigger>
      <SelectContent>
        {SPONSOR_TIERS.map((t) => (
          <SelectItem key={t.key} value={t.key}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AddSponsorToYearDialogProps {
  year: number;
  open: boolean;
  onClose: () => void;
  /** Tier to use when the admin started from an empty tier slot */
  presetTier?: string;
  /** "Add new sponsor" from the search: open the full sponsor form with this name */
  onCreateNew: (name: string, tier: string | undefined) => void;
}

/**
 * Adds an existing sponsor to a year: search all sponsors, pick one, choose the
 * tier (defaults to their last tier). Nothing is retyped or re-uploaded.
 */
export function AddSponsorToYearDialog({ year, open, onClose, presetTier, onCreateNew }: AddSponsorToYearDialogProps) {
  const { toast } = useToast();
  const [sponsor, setSponsor] = useState<SponsorWithHistory | null>(null);
  const [tier, setTier] = useState(presetTier ?? "Series A");

  useEffect(() => {
    if (open) {
      setSponsor(null);
      setTier(presetTier ?? "Series A");
    }
  }, [open, presetTier]);

  const addMutation = useMutation({
    mutationFn: () => apiRequest("/api/sponsorships", "POST", { sponsorId: sponsor!.id, year, tier }),
    onSuccess: async () => {
      await invalidateSponsorQueries();
      toast({ title: "Sponsor added", description: `${sponsor!.name} added to ${year} as ${tier}` });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Couldn't add sponsor",
        description: apiErrorMessage(error, "Failed to add sponsor to this year"),
        variant: "destructive",
      });
    },
  });

  const handlePick = (picked: SponsorWithHistory | null) => {
    setSponsor(picked);
    // Default to the sponsor's last tier unless the admin started from a tier slot
    if (picked && !presetTier) setTier(picked.sponsorships[0]?.tier ?? "Series A");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add sponsor to {year}</DialogTitle>
          <DialogDescription>
            Search existing sponsors to reuse their logo and link, or add a sponsor that has never been entered.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (sponsor) addMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="add-sponsor-picker">Sponsor</Label>
            <SponsorPicker
              id="add-sponsor-picker"
              value={sponsor?.id ?? null}
              onChange={handlePick}
              onCreateNew={(name) => onCreateNew(name, presetTier)}
              disabledReason={(s) => (s.sponsorships.some((sp) => sp.year === year) ? `Already a ${year} sponsor` : null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-sponsor-tier">{year} tier</Label>
            <TierSelect id="add-sponsor-tier" value={tier} onChange={setTier} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!sponsor || addMutation.isPending} data-testid="button-add-sponsorship">
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to {year}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ChangeTierDialogProps {
  sponsorship: { sponsorshipId: number; name: string; year: number; tier: string } | null;
  onClose: () => void;
}

/** Changes one year's tier for a sponsor; other years are untouched. */
export function ChangeTierDialog({ sponsorship, onClose }: ChangeTierDialogProps) {
  const { toast } = useToast();
  const [tier, setTier] = useState(sponsorship?.tier ?? "Series A");

  useEffect(() => {
    if (sponsorship) setTier(sponsorship.tier);
  }, [sponsorship]);

  const mutation = useMutation({
    mutationFn: () => apiRequest(`/api/sponsorships/${sponsorship!.sponsorshipId}`, "PATCH", { tier }),
    onSuccess: async () => {
      await invalidateSponsorQueries();
      toast({ title: "Tier updated", description: `${sponsorship!.name} is now ${tier} for ${sponsorship!.year}` });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Couldn't change tier",
        description: apiErrorMessage(error, "Failed to change tier"),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={sponsorship !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change tier</DialogTitle>
          <DialogDescription>
            {sponsorship ? `${sponsorship.name}'s tier for ${sponsorship.year} only.` : null}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <TierSelect id="change-sponsor-tier" value={tier} onChange={setTier} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-tier">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
