// Initialize Google Maps API
let isInitialized = false;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    // Validate API key exists
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your environment.'));
      return;
    }

    // Check if script is already loaded
    if (typeof window.google !== 'undefined' && window.google.maps) {
      isInitialized = true;
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    // Setup load handlers
    script.onload = () => {
      isInitialized = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script. Please check your API key and network connection.'));

    // Add to document
    document.head.appendChild(script);
  });
};

// Export a function to ensure Google Maps is loaded
export const initGoogleMaps = async () => {
  if (isInitialized) {
    return true;
  }

  try {
    await loadGoogleMapsScript();
    return true;
  } catch (error) {
    console.error('Error initializing Google Maps:', error);
    return false;
  }
};

// Helper to check if Maps is initialized
export const isGoogleMapsLoaded = () => {
  return isInitialized && typeof window.google !== 'undefined' && window.google.maps;
};