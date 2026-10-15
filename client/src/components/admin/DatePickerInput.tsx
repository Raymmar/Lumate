import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  id?: string;
  /** YYYY-MM-DD, or "" for none */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  "data-testid"?: string;
}

const toDate = (value: string) => (value ? parse(value, "yyyy-MM-dd", new Date()) : undefined);

/** Date picker that reads and writes a YYYY-MM-DD string. */
export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  readOnly,
  className,
  "data-testid": testId,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const date = toDate(value);
  const valid = date && !Number.isNaN(date.getTime());

  return (
    <div className="flex items-center gap-1">
      <Popover open={open && !readOnly} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={readOnly}
            className={cn("w-full justify-start font-normal disabled:opacity-100", !value && "text-muted-foreground", className)}
            data-testid={testId}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {valid ? format(date, "MMMM d, yyyy") : value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valid ? date : undefined}
            defaultMonth={valid ? date : undefined}
            onSelect={(next) => {
              if (next) onChange(format(next, "yyyy-MM-dd"));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && !readOnly && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear date" onClick={() => onChange("")}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
