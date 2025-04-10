import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef, useLayoutEffect, useState, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchInput({ value, onChange, placeholder = "Search...", isLoading }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const cursorPositionRef = useRef<number | null>(null);

  // Force focus back to input when loading state changes
  useEffect(() => {
    if (!isLoading && inputRef.current && isFocused) {
      inputRef.current.focus();
      if (cursorPositionRef.current !== null) {
        inputRef.current.setSelectionRange(
          cursorPositionRef.current,
          cursorPositionRef.current
        );
      }
    }
  }, [isLoading, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cursorPositionRef.current = e.target.selectionStart;
    onChange(e.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (inputRef.current) {
      cursorPositionRef.current = inputRef.current.selectionStart;
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    cursorPositionRef.current = null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-[280px]">
      <Search 
        className={`absolute left-2.5 top-2.5 h-4 w-4 transition-colors ${
          isLoading ? 'text-muted-foreground/50' : 'text-muted-foreground'
        }`} 
      />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`pl-9 transition-opacity duration-150 border-primary/20 hover:border-primary/30
          ${isLoading ? 'opacity-50' : 'opacity-100'}
          ${value ? 'bg-primary/5 border-primary/30' : ''}
          focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/40 focus-visible:bg-primary/5`}
        disabled={isLoading}
      />
      {value && !isLoading && (
        <button
          type="button"
          className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}