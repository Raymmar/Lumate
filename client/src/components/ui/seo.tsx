import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
}

export function SEO({ title, description, image }: SEOProps) {
  useEffect(() => {
    // Update meta tags
    if (title) {
      document.title = title;
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
      document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', title);
    }

    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', description);
    }

    if (image) {
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', image);
      document.querySelector('meta[property="twitter:image"]')?.setAttribute('content', image);
    }

    // Cleanup function to restore default values
    return () => {
      document.title = 'Sarasota Tech';
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Sarasota Tech');
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg');
      document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', 'Sarasota Tech');
      document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      document.querySelector('meta[property="twitter:image"]')?.setAttribute('content', 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg');
    };
  }, [title, description, image]);

  return null;
}
