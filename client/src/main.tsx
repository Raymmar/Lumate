import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add an initialization listener to handle page refresh flags
const checkForceRefresh = () => {
  try {
    const forceRefresh = sessionStorage.getItem('force_complete_refresh');
    const timestamp = sessionStorage.getItem('refresh_timestamp');
    
    if (forceRefresh === 'true') {
      console.log(`APPLICATION REINITIALIZED AFTER FORCED REFRESH (timestamp: ${timestamp})`);
      // Clear the flag to prevent infinite refresh cycles
      sessionStorage.removeItem('force_complete_refresh');
      sessionStorage.removeItem('refresh_timestamp');
      
      // Clear any caches and preload critical data instead of relying on cached versions
      console.log('ENSURING CLEAN APPLICATION STATE');
      
      // If needed, could add more initialization logic here
    }
  } catch (e) {
    console.error('Error checking session storage:', e);
  }
};

// Run initialization check at startup
checkForceRefresh();

// Now render the application
createRoot(document.getElementById("root")!).render(<App />);
