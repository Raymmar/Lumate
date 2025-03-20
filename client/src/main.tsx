import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SEOProvider } from "@/components/ui/seo";

createRoot(document.getElementById("root")!).render(
  <SEOProvider>
    <App />
  </SEOProvider>
);
