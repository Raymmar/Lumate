import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchInput({ value, onChange, placeholder = "Search...", isLoading }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Preserve focus state after re-render
  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      const cursorPosition = inputRef.current.selectionStart;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-[250px]">
      <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${isLoading ? 'animate-pulse' : ''} text-muted-foreground`} />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isLoading}
      />
    </form>
  );
}