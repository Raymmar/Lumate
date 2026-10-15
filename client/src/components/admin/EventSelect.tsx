import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AdminEventOption {
  apiId: string;
  title: string;
  startTime: string;
}

/** Recent synced Luma events (admin only), newest first. */
export function useAdminEvents(enabled = true) {
  return useQuery<{ events: AdminEventOption[] }, Error, AdminEventOption[]>({
    queryKey: ["/api/admin/events-list"],
    select: (data) => data.events ?? [],
    enabled,
  });
}

const NONE = "__none__";

interface EventSelectProps {
  /** Selected Luma event api_id, or null for none */
  value: string | null;
  onChange: (apiId: string | null) => void;
  /** When set, adds a "no event" option with this label */
  noneLabel?: string;
  placeholder?: string;
  /** Label for a selected event that isn't in the recent events list */
  missingLabel?: string;
  /** Only load the list while true (e.g. while a dialog is open) */
  enabled?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}

/** Dropdown of synced Luma events, shared by admin forms. */
export function EventSelect({
  value,
  onChange,
  noneLabel,
  placeholder = "Select an event...",
  missingLabel,
  enabled = true,
  id,
  className,
  "data-testid": testId,
}: EventSelectProps) {
  const { data: events = [], isSuccess } = useAdminEvents(enabled);
  // Show the selected event's label straight away, even before the list has loaded
  const selectedMissing =
    value != null && (!isSuccess ? missingLabel != null : !events.some((event) => event.apiId === value));

  return (
    <Select
      value={value ?? (noneLabel ? NONE : "")}
      onValueChange={(val) => onChange(val === NONE ? null : val)}
    >
      <SelectTrigger id={id} className={className} data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {selectedMissing && <SelectItem value={value}>{missingLabel ?? value}</SelectItem>}
        {events.map((event) => (
          <SelectItem key={event.apiId} value={event.apiId}>
            <span className="truncate">{event.title}</span>
            <span className="text-muted-foreground ml-1">({new Date(event.startTime).toLocaleDateString()})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
