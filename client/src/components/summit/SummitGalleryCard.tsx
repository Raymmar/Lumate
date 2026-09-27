import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { SummitGalleryImage } from "@shared/schema";

interface SummitGalleryCardProps {
  images: SummitGalleryImage[];
  photosUrl?: string | null;
}

export function SummitGalleryCard({ images, photosUrl }: SummitGalleryCardProps) {
  const [selectedImage, setSelectedImage] = useState<SummitGalleryImage | null>(null);

  if (images.length === 0 && !photosUrl) return null;

  return (
    <>
      <Card className="border pt-3 md:pt-4 w-full max-w-full overflow-hidden" data-testid="card-summit-gallery">
        {photosUrl && (
          <CardHeader className="p-3 md:p-4 pt-0 flex flex-row items-center justify-between space-y-0">
            <CardTitle>Photos</CardTitle>
            <a href={photosUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" data-testid="button-summit-photos">
                View all photos
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </CardHeader>
        )}
        {images.length > 0 && (
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div
                  key={`${image.src}-${index}`}
                  className="relative overflow-hidden rounded-lg cursor-pointer group aspect-video"
                  onClick={() => setSelectedImage(image)}
                  data-testid={`gallery-image-${index}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{image.title || "View"}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-screen-lg max-h-[90vh]">
            <img
              src={selectedImage.src}
              alt={selectedImage.alt || "Enlarged view"}
              className="max-h-[80vh] max-w-full object-contain"
            />
            {(selectedImage.title || selectedImage.description) && (
              <div className="text-white text-center mt-3 px-4">
                {selectedImage.title && <p className="font-semibold">{selectedImage.title}</p>}
                {selectedImage.description && (
                  <p className="text-sm text-white/80">{selectedImage.description}</p>
                )}
              </div>
            )}
            <button
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
