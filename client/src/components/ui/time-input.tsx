import { useState, useRef, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

function generateTimeOptions(intervalMinutes: number = 5): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${minutes} ${ampm}`;
}

function parseTimeInput(input: string): string | null {
  const cleaned = input.toLowerCase().replace(/\s+/g, '');
  
  let match = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if (match) {
    let hours = parseInt(match[1]);
    let minutes = parseInt(match[2] || '0');
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      minutes = Math.round(minutes / 5) * 5;
      if (minutes >= 60) {
        minutes = 55;
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  
  return null;
}

const TIME_OPTIONS = generateTimeOptions(5);

export function TimeInput({ value, onChange, placeholder = "Type or select time...", className, "data-testid": testId }: TimeInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setInputValue(formatTimeDisplay(value));
    } else {
      setInputValue("");
    }
  }, [value]);

  const filteredTimes = TIME_OPTIONS.filter(time => {
    if (!inputValue) return true;
    const display = formatTimeDisplay(time).toLowerCase();
    const search = inputValue.toLowerCase();
    return display.includes(search) || time.includes(search);
  });

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setOpen(true);
  };

  const handleSelectTime = (time: string) => {
    onChange(time);
    setInputValue(formatTimeDisplay(time));
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (inputValue) {
        const parsed = parseTimeInput(inputValue);
        if (parsed) {
          onChange(parsed);
          setInputValue(formatTimeDisplay(parsed));
        } else if (value) {
          setInputValue(formatTimeDisplay(value));
        } else {
          setInputValue("");
        }
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      const parsed = parseTimeInput(inputValue);
      if (parsed) {
        handleSelectTime(parsed);
      } else if (filteredTimes.length > 0) {
        handleSelectTime(filteredTimes[0]);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-8"
            data-testid={testId}
          />
          <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            <CommandEmpty>No times found</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {filteredTimes.slice(0, 50).map((time) => (
                <CommandItem
                  key={time}
                  value={time}
                  onSelect={() => handleSelectTime(time)}
                  className="cursor-pointer"
                >
                  {formatTimeDisplay(time)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
