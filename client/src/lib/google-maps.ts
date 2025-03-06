// Initialize Google Maps API
let isInitialized = false;

const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (typeof window.google !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
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
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing Google Maps:', error);
    return false;
  }
};