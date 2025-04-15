import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface IndustrySelectorProps {
  industry: string | null;
  onIndustryChange: (industry: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function IndustrySelector({
  industry,
  onIndustryChange,
  readOnly = false,
  placeholder = "Search or select an industry...",
  className
}: IndustrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Fetch all industries from the server
  const { data } = useQuery({
    queryKey: ["/api/industries"],
    queryFn: async () => {
      const response = await fetch("/api/industries");
      if (!response.ok) {
        throw new Error("Failed to fetch industries");
      }
      return response.json();
    }
  });
  
  const industries = data?.industries?.map((industry: { name: string }) => industry.name) || [];
  
  const filteredIndustries = searchTerm 
    ? industries.filter((ind: string) => 
        ind.toLowerCase().includes(searchTerm.toLowerCase()) &&
        ind.toLowerCase() !== industry?.toLowerCase()
      )
    : [];
  
  const handleRemoveIndustry = () => {
    onIndustryChange(null);
  };
  
  const handleSelectIndustry = (value: string) => {
    const normalizedIndustry = value.trim();
    onIndustryChange(normalizedIndustry);
    setSearchTerm("");
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      handleSelectIndustry(searchTerm);
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {industry ? (
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge key={industry} variant="secondary" className="gap-1">
            {industry}
            {!readOnly && (
              <button
                type="button"
                onClick={handleRemoveIndustry}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </div>
      ) : (
        readOnly && <div className="text-sm text-muted-foreground">No industry selected</div>
      )}
      
      {!readOnly && !industry && (
        <div className="relative">
          <Command className="rounded-lg overflow-visible border">
            <CommandInput
              placeholder={placeholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Small delay to allow clicking on suggestions
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              className="border-0 focus:ring-0 focus-visible:ring-0"
            />
            {isSearchFocused && (searchTerm || filteredIndustries.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-popover rounded-lg shadow-md mt-1 z-50">
                <CommandEmpty>
                  {searchTerm.trim() && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => handleSelectIndustry(searchTerm)}
                    >
                      Use "{searchTerm}" as industry
                    </button>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredIndustries.map((ind: string) => (
                    <CommandItem
                      key={ind}
                      value={ind}
                      onSelect={handleSelectIndustry}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          industry === ind ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {ind}
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