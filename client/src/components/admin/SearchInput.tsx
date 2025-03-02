import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef, useLayoutEffect, useState } from "react";

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

  // Use useLayoutEffect to handle focus synchronously before browser paint
  useLayoutEffect(() => {
    if (isFocused && inputRef.current) {
      const input = inputRef.current;

      // Restore focus
      input.focus();

      // Restore cursor position if we have one stored
      if (cursorPositionRef.current !== null) {
        input.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
      }
    }
  }, [value, isFocused]); // Only re-run if value or focus state changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Store current cursor position before the update
    cursorPositionRef.current = e.target.selectionStart;
    onChange(e.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Store initial cursor position on focus
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
    <form onSubmit={handleSubmit} className="relative w-[250px]">
      <Search 
        className={`absolute left-2.5 top-2.5 h-4 w-4 transition-opacity duration-150 
          ${isLoading ? 'animate-pulse opacity-50' : 'opacity-100'} text-muted-foreground`} 
      />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`pl-9 transition-opacity duration-150 focus-visible:ring-0 focus-visible:ring-offset-0
          ${isLoading ? 'opacity-80' : 'opacity-100'}`}
        disabled={isLoading}
      />
    </form>
  );
}