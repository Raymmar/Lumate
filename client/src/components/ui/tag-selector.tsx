import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  tags: string[];
  maxTags?: number;
  onTagsChange: (tags: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagSelector({
  tags = [],
  maxTags = 10,
  onTagsChange,
  readOnly = false,
  placeholder = "Search or add new tag...",
  className
}: TagSelectorProps) {
  const [currentTag, setCurrentTag] = useState("");
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);
  
  // Fetch all existing tags from the server
  const { data } = useQuery({
    queryKey: ["/api/tags"],
    queryFn: async () => {
      const response = await fetch("/api/tags");
      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }
      return response.json();
    }
  });
  
  const existingTags = data?.tags?.map((tag: { text: string }) => tag.text) || [];
  
  const filteredTags = currentTag 
    ? existingTags.filter((tag: string) => 
        tag.toLowerCase().includes(currentTag.toLowerCase()) &&
        !tags.includes(tag.toLowerCase())
      )
    : [];
  
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
  };
  
  const handleSelectTag = (value: string) => {
    const normalizedTag = value.toLowerCase().trim();
    if (!tags.includes(normalizedTag) && tags.length < maxTags) {
      onTagsChange([...tags, normalizedTag]);
    }
    setCurrentTag("");
  };
  
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim() && !tags.includes(currentTag.trim().toLowerCase()) && tags.length < maxTags) {
      e.preventDefault();
      handleSelectTag(currentTag);
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      
      {!readOnly && tags.length < maxTags && (
        <div className="relative">
          <Command className="rounded-lg overflow-visible border">
            <CommandInput
              placeholder={placeholder}
              value={currentTag}
              onValueChange={setCurrentTag}
              onKeyDown={handleAddTag}
              onFocus={() => setIsTagSearchFocused(true)}
              onBlur={() => {
                // Small delay to allow clicking on suggestions
                setTimeout(() => setIsTagSearchFocused(false), 200);
              }}
              className="border-0 focus:ring-0 focus-visible:ring-0"
            />
            {isTagSearchFocused && (currentTag || filteredTags.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-popover rounded-lg shadow-md mt-1 z-50">
                <CommandEmpty>
                  {currentTag.trim() && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => handleSelectTag(currentTag)}
                    >
                      Create tag "{currentTag}"
                    </button>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredTags.map((tag: string) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={handleSelectTag}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          tags.includes(tag.toLowerCase()) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            )}
          </Command>
        </div>
      )}
    </div>
  );
}