export interface CardOverlay {
  id: string;
  label: string;
  url: string;
  color?: string;
  description?: string;
}

export const CARD_OVERLAYS: CardOverlay[] = [
  {
    id: "yellow",
    label: "Yellow",
    url: "https://file-upload.replit.app/api/storage/images%2F1767194323312-Speaker-card-overlay5.png",
    color: "#F59E0B",
    description: "Classic yellow summit overlay",
  },
  {
    id: "blue",
    label: "Blue",
    url: "https://file-upload.replit.app/api/storage/images%2F1767297702156-Speaker-card-overlay-blue.png",
    color: "#3B82F6",
    description: "Blue tinted overlay",
  },
];

export const DEFAULT_OVERLAY_ID = "yellow";

export function getOverlayById(id: string): CardOverlay | undefined {
  return CARD_OVERLAYS.find(overlay => overlay.id === id);
}

export function getDefaultOverlay(): CardOverlay {
  return CARD_OVERLAYS.find(overlay => overlay.id === DEFAULT_OVERLAY_ID) || CARD_OVERLAYS[0];
}
