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

interface IndustrySelectorProps {
  industry: string | null;
  onIndustryChange: (industry: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function IndustrySelector({
  industry = null,
  onIndustryChange,
  readOnly = false,
  placeholder = "Select an industry...",
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
  
  const industries = data?.industries || [];
  
  const filteredIndustries = searchTerm 
    ? industries.filter((ind: { name: string }) => 
        ind.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : industries;
  
  const handleClearIndustry = () => {
    onIndustryChange(null);
  };
  
  const handleSelectIndustry = (industryName: string) => {
    onIndustryChange(industryName);
    setSearchTerm("");
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      {industry && (
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary" className="gap-1">
            {industry}
            {!readOnly && (
              <button
                type="button"
                onClick={handleClearIndustry}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </div>
      )}
      
      {!readOnly && !industry && (
        <div className="relative">
          <Command className="rounded-lg overflow-visible border">
            <CommandInput
              placeholder={placeholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Small delay to allow clicking on suggestions
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              className="border-0 focus:ring-0 focus-visible:ring-0"
            />
            {isSearchFocused && (searchTerm || filteredIndustries.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-popover rounded-lg shadow-md mt-1 z-50 max-h-60 overflow-y-auto">
                <CommandEmpty>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No industries found
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredIndustries.map((ind: { id: number; name: string; category: string | null }) => (
                    <CommandItem
                      key={ind.id}
                      value={ind.name}
                      onSelect={() => handleSelectIndustry(ind.name)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          industry === ind.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{ind.name}</span>
                      {ind.category && (
                        <span className="text-xs text-muted-foreground">{ind.category}</span>
                      )}
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