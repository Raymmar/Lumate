import { useEffect, useState } from 'react';

interface FileValidatorProps {
  url: string;
  onError: (error: string) => void;
  onSuccess: () => void;
}

export function FileValidator({ url, onError, onSuccess }: FileValidatorProps) {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateImage = async () => {
      if (!url) {
        setIsValidating(false);
        return;
      }

      try {
        // First try a HEAD request to check if the file exists
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`File not accessible: ${response.status}`);
        }

        // Then try to load the image
        const img = new Image();
        img.onload = () => {
          setIsValidating(false);
          onSuccess();
        };
        img.onerror = () => {
          setIsValidating(false);
          onError('Failed to load image');
        };
        img.src = url;
      } catch (error) {
        setIsValidating(false);
        onError(error instanceof Error ? error.message : 'Failed to validate image');
      }
    };

    validateImage();
  }, [url, onError, onSuccess]);

  return null; // This is a utility component that doesn't render anything
}
