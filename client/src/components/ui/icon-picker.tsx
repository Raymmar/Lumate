import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

// List of common social and profile-related icons
const availableIcons = [
  "Link",
  "Globe",
  "Twitter",
  "Github",
  "Linkedin",
  "Facebook",
  "Instagram",
  "Youtube",
  "Mail",
  "Phone",
  "MapPin",
  "Briefcase",
  "Calendar",
  "MessageSquare",
  "Video",
  "Image",
  "FileText",
  "Bookmark",
  "Star",
  "Heart",
  "User",
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <Command className="h-auto max-h-[200px] overflow-auto">
      <CommandInput placeholder="Search icons..." />
      <CommandEmpty>No icons found.</CommandEmpty>
      <CommandGroup>
        {availableIcons.map((iconName) => {
          const Icon = LucideIcons[iconName as keyof typeof LucideIcons];
          return (
            <CommandItem
              key={iconName}
              value={iconName}
              onSelect={() => onChange(iconName.toLowerCase())}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon className="h-4 w-4" />
              <span>{iconName}</span>
              {value === iconName.toLowerCase() && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </CommandItem>
          );
        })}
      </CommandGroup>
    </Command>
  );
}
