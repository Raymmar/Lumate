import { useState, useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./command";
import { Button } from './button';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Location } from "@shared/schema";
import { initGoogleMaps, isGoogleMapsLoaded } from "@/lib/google-maps";

interface LocationPickerProps {
  defaultValue?: Location | null;
  onLocationSelect: (location: Location | null) => void;
  className?: string;
}

export function LocationPicker({ defaultValue, onLocationSelect, className }: LocationPickerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initGoogleMaps();
      setIsInitializing(false);
    };
    init();
  }, []);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { 
      componentRestrictions: { country: 'us' },
      types: ['address']
    },
    debounce: 300,
    defaultValue: '',
    initOnMount: !isInitializing && isGoogleMapsLoaded(),
  });

  // Set initial value from defaultValue when component mounts or defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      // Prefer formatted_address over address
      const displayAddress = defaultValue.formatted_address || defaultValue.address;
      setValue(displayAddress, false);
    }
  }, [defaultValue, setValue]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    setIsOpen(false);

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);

      // Parse address components
      const addressComponents = results[0].address_components;
      const location: Location = {
        address: results[0].formatted_address,
        city: addressComponents.find((c: any) => c.types.includes("locality"))?.long_name,
        region: addressComponents.find((c: any) => c.types.includes("administrative_area_level_1"))?.long_name,
        country: addressComponents.find((c: any) => c.types.includes("country"))?.long_name,
        latitude: lat.toString(),
        longitude: lng.toString(),
        placeId: results[0].place_id,
        formatted_address: results[0].formatted_address,
      };

      onLocationSelect(location);
    } catch (error) {
      console.error("Error selecting location:", error);
    }
  };

  const handleClear = () => {
    setValue("");
    clearSuggestions();
    onLocationSelect(null);
  };

  if (isInitializing || !ready) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Command className="rounded-lg border overflow-visible">
          <CommandInput
            placeholder="Enter your address..."
            value={value}
            onValueChange={(value) => {
              setValue(value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="border-0"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isOpen && status === "OK" && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md z-50">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={() => handleSelect(description)}
                    className="cursor-pointer"
                  >
                    {description}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )}
        </Command>
      </div>
    </div>
  );
}