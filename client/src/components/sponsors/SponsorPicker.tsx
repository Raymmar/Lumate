import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import type { SponsorWithHistory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatSponsorYears, useAllSponsors } from "./sponsorApi";

interface SponsorPickerProps {
  /** Selected sponsor id */
  value: number | null;
  onChange: (sponsor: SponsorWithHistory | null) => void;
  /** Called with the typed text when the admin chooses "Add new sponsor" */
  onCreateNew?: (name: string) => void;
  /** Return a reason (e.g. "Already in 2026") to show a sponsor but not allow picking it */
  disabledReason?: (sponsor: SponsorWithHistory) => string | null;
  /** Show a clear button when a sponsor is selected */
  allowClear?: boolean;
  placeholder?: string;
  id?: string;
}

function SponsorLogo({ sponsor }: { sponsor: Pick<SponsorWithHistory, "logo" | "name"> }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-white p-0.5">
      {sponsor.logo ? (
        <img src={sponsor.logo} alt="" className="max-h-full max-w-full object-contain" />
      ) : null}
    </span>
  );
}

/**
 * Searchable combobox over every sponsor (logo, name, years sponsored) with an
 * "Add new sponsor" option. Shared by the Sponsors admin and the summit form.
 */
export function SponsorPicker({
  value,
  onChange,
  onCreateNew,
  disabledReason,
  allowClear = false,
  placeholder = "Search sponsors...",
  id,
}: SponsorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAllSponsors();
  const sponsors = data?.sponsors ?? [];
  const selected = sponsors.find((s) => s.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sponsors;
    return sponsors.filter((s) => s.name.toLowerCase().includes(q));
  }, [sponsors, search]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-10 flex-1 justify-between py-1.5 font-normal"
            data-testid="sponsor-picker-trigger"
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                <SponsorLogo sponsor={selected} />
                <span className="truncate">{selected.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {value != null && isLoading ? "Loading..." : placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type a sponsor name..."
              value={search}
              onValueChange={setSearch}
              data-testid="sponsor-picker-search"
            />
            <CommandList className="max-h-72">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading sponsors...</div>
              ) : (
                <CommandEmpty>No sponsors match "{search.trim()}".</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((sponsor) => {
                    const reason = disabledReason?.(sponsor) ?? null;
                    const years = formatSponsorYears(sponsor);
                    return (
                      <CommandItem
                        key={sponsor.id}
                        value={`sponsor-${sponsor.id}`}
                        disabled={Boolean(reason)}
                        onSelect={() => {
                          onChange(sponsor);
                          close();
                        }}
                        className="gap-2"
                        data-testid={`sponsor-option-${sponsor.id}`}
                      >
                        <SponsorLogo sponsor={sponsor} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{sponsor.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {reason ?? (years ? `Sponsored ${years}` : "No sponsorships yet")}
                          </span>
                        </span>
                        <Check className={cn("h-4 w-4", value === sponsor.id ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {onCreateNew && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value="add-new-sponsor"
                      onSelect={() => {
                        const name = search.trim();
                        close();
                        onCreateNew(name);
                      }}
                      data-testid="sponsor-option-add-new"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {search.trim() ? `Add new sponsor "${search.trim()}"` : "Add new sponsor"}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowClear && value != null && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear sponsor"
          onClick={() => onChange(null)}
          data-testid="sponsor-picker-clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
