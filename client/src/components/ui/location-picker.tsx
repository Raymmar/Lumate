import { useState, useCallback, useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Input } from './input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./command";
import { Button } from './button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initGoogleMaps } from '@/lib/google-maps';
import { Loader2 } from 'lucide-react';

interface LocationPickerProps {
  defaultValue?: {
    address: string;
    city?: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    placeId?: string;
    formatted_address?: string;
  } | null;
  onLocationSelect: (location: {
    address: string;
    city?: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    placeId?: string;
    formatted_address?: string;
  } | null) => void;
  className?: string;
}

export function LocationPicker({ defaultValue, onLocationSelect, className }: LocationPickerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    initGoogleMaps().then(() => setIsReady(true));
  }, []);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: 'us' } },
    debounce: 300,
    defaultValue: defaultValue?.address,
    initOnMount: false, // Don't initialize until Google Maps is ready
  });

  useEffect(() => {
    if (isReady) {
      // Initialize Places Autocomplete after Google Maps is ready
      usePlacesAutocomplete.init();
    }
  }, [isReady]);

  const handleSelect = useCallback(async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    setIsOpen(false);

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);

      // Parse address components
      const addressComponents = results[0].address_components;
      const location = {
        address: address,
        city: addressComponents.find(c => c.types.includes("locality"))?.long_name,
        region: addressComponents.find(c => c.types.includes("administrative_area_level_1"))?.long_name,
        country: addressComponents.find(c => c.types.includes("country"))?.long_name,
        latitude: lat.toString(),
        longitude: lng.toString(),
        placeId: results[0].place_id,
        formatted_address: results[0].formatted_address,
      };

      onLocationSelect(location);
    } catch (error) {
      console.error("Error selecting location:", error);
    }
  }, [setValue, clearSuggestions, onLocationSelect]);

  const handleClear = () => {
    setValue("");
    clearSuggestions();
    onLocationSelect(null);
  };

  if (!isReady || !ready) {
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
            placeholder="Search for an address..."
            value={value}
            onValueChange={(value) => {
              setValue(value);
              setIsOpen(true);
            }}
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