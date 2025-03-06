import { useState, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';

const libraries: ("places")[] = ["places"];

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
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [selected, setSelected] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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
  });

  const handleSelect = useCallback(async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      setSelected({ lat, lng });

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
  }, []);

  const mapRef = useRef<google.maps.Map>();
  const center = useRef({ lat: 27.3364, lng: -82.5307 }); // Default to Sarasota

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Search for a location..."
          className="w-full"
        />
        {status === "OK" && (
          <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1">
            {data.map(({ place_id, description }) => (
              <li
                key={place_id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(description)}
              >
                {description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-[300px] w-full rounded-md overflow-hidden">
        <GoogleMap
          zoom={selected ? 15 : 11}
          center={selected || center.current}
          mapContainerClassName="w-full h-full"
          onLoad={onMapLoad}
        >
          {selected && <Marker position={selected} />}
        </GoogleMap>
      </div>

      {value && (
        <Button
          variant="outline"
          onClick={() => {
            setValue("");
            setSelected(null);
            onLocationSelect(null);
          }}
        >
          Clear Location
        </Button>
      )}
    </div>
  );
}