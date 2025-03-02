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

  // Use requestAnimationFrame to handle focus and cursor position after state updates
  useLayoutEffect(() => {
    if (isFocused && inputRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (cursorPositionRef.current !== null) {
            inputRef.current.setSelectionRange(
              cursorPositionRef.current,
              cursorPositionRef.current
            );
          }
        }
      });
    }
  }, [value, isFocused]);

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
    <form onSubmit={handleSubmit} className="relative w-[250px]">
      <Search 
        className={`absolute left-2.5 top-2.5 h-4 w-4 transition-colors ${
          isLoading ? 'text-muted-foreground/50' : 'text-muted-foreground'
        }`} 
      />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`pl-9 transition-opacity duration-150
          ${isLoading ? 'opacity-50' : 'opacity-100'}
          focus-visible:ring-0 focus-visible:ring-offset-0`}
        disabled={isLoading}
      />
    </form>
  );
}