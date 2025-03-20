import { useEffect, useContext, createContext, ReactNode, useState } from 'react';

// Default site-wide SEO values
const DEFAULT_TITLE = 'Sarasota Tech';
const DEFAULT_DESCRIPTION = 'Connecting Sarasota\'s tech community and driving the city forward.';
const DEFAULT_IMAGE = 'https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg';

// Context to store the current SEO values
type SEOContextType = {
  title: string;
  description: string;
  image: string;
  updateSEO: (data: { title?: string; description?: string; image?: string }) => void;
  resetSEO: () => void;
};

const SEOContext = createContext<SEOContextType>({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_IMAGE,
  updateSEO: () => {},
  resetSEO: () => {},
});

export function SEOProvider({ children }: { children: ReactNode }) {
  const [seo, setSEO] = useState({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
  });

  const updateSEO = ({ title, description, image }: { title?: string; description?: string; image?: string }) => {
    setSEO(prev => ({
      title: title || prev.title,
      description: description || prev.description,
      image: image || prev.image,
    }));
  };

  const resetSEO = () => {
    setSEO({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      image: DEFAULT_IMAGE,
    });
  };

  useEffect(() => {
    // Update document meta tags whenever seo state changes
    document.title = seo.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', seo.image);
    document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', seo.title);
    document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', seo.description);
    document.querySelector('meta[property="twitter:image"]')?.setAttribute('content', seo.image);
  }, [seo]);

  return (
    <SEOContext.Provider value={{ ...seo, updateSEO, resetSEO }}>
      {children}
    </SEOContext.Provider>
  );
}

export function useSEO() {
  return useContext(SEOContext);
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
}

export function SEO({ title, description, image }: SEOProps) {
  const { updateSEO } = useSEO();

  useEffect(() => {
    if (title || description || image) {
      updateSEO({
        title: title || undefined,
        description: description || undefined,
        image: image || undefined,
      });
    }

    // No need for cleanup as the context will handle persistence between routes
  }, [title, description, image, updateSEO]);

  return null;
}
