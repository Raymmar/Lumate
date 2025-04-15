import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
}

export function SEO({ title, description, image }: SEOProps) {
  useEffect(() => {
    // Ensure that meta tags exist and create them if they don't
    const ensureMetaTag = (selector: string, attribute: string, defaultValue: string) => {
      let metaTag = document.querySelector(selector);
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        const propertyName = selector.includes('property=') ? 'property' : 'name';
        const propertyValue = selector.match(/["']([^"']+)["']/)?.[1] || '';
        metaTag.setAttribute(propertyName, propertyValue);
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute(attribute, defaultValue);
    };

    // Handle title - both document title and meta tags
    if (title) {
      document.title = title;
      ensureMetaTag('meta[property="og:title"]', 'content', title);
      ensureMetaTag('meta[property="twitter:title"]', 'content', title);
    }

    // Handle description meta tags
    if (description) {
      ensureMetaTag('meta[name="description"]', 'content', description);
      ensureMetaTag('meta[property="og:description"]', 'content', description);
      ensureMetaTag('meta[property="twitter:description"]', 'content', description);
    }

    // Handle image meta tags
    if (image) {
      // Ensure image has absolute URL
      const absoluteImageUrl = image.startsWith('http') ? image : `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}`;
      ensureMetaTag('meta[property="og:image"]', 'content', absoluteImageUrl);
      ensureMetaTag('meta[property="twitter:image"]', 'content', absoluteImageUrl);
    }

    // Ensure type meta tags for Open Graph
    ensureMetaTag('meta[property="og:type"]', 'content', 'website');
    ensureMetaTag('meta[property="og:url"]', 'content', window.location.href);
    ensureMetaTag('meta[property="twitter:card"]', 'content', 'summary_large_image');

    // Cleanup function to restore default values
    return () => {
      document.title = 'Sarasota Tech';
      ensureMetaTag('meta[name="description"]', 'content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      ensureMetaTag('meta[property="og:title"]', 'content', 'Sarasota Tech');
      ensureMetaTag('meta[property="og:description"]', 'content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      ensureMetaTag('meta[property="og:image"]', 'content', 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg');
      ensureMetaTag('meta[property="twitter:title"]', 'content', 'Sarasota Tech');
      ensureMetaTag('meta[property="twitter:description"]', 'content', 'Connecting Sarasota\'s tech community and driving the city forward.');
      ensureMetaTag('meta[property="twitter:image"]', 'content', 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg');
    };
  }, [title, description, image]);

  return null;
}
