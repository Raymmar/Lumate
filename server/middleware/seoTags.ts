import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Express middleware that modifies HTML responses for profile pages
 * to include proper Open Graph meta tags based on the user's profile data.
 * This ensures links shared on social media platforms show rich previews.
 */
export const profileMetaTags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const originalSend = res.send;
    
    // Override the send method to modify HTML responses
    res.send = function(this: Response, body: any) {
      // Only process HTML responses
      if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
        // Check if this is a person profile page
        const profilePattern = /\/person\/([^/?#]+)/;
        const match = req.originalUrl.match(profilePattern);
        
        if (match && match[1]) {
          const username = decodeURIComponent(match[1]);
          console.log(`Modifying meta tags for profile: ${username}`);
          
          // Function to process the HTML with user data
          const processHtmlWithUserData = async () => {
            try {
              // Find the person by username
              const person = await storage.getPersonByUsername(username);
              
              if (!person) {
                console.log(`Person not found for username: ${username}`);
                return originalSend.call(res, body);
              }
              
              // Extract profile data
              const displayName = person.userName || person.fullName || username;
              const userBio = person.bio || null;
              const avatarUrl = person.avatarUrl || null;
              
              // Default meta values
              let metaTitle = `${displayName} | Sarasota Tech`;
              let metaDesc = userBio || `Member of the Sarasota Tech Community`;
              let metaImage = avatarUrl || "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg";
              
              // Try to get additional user data if available
              const userData = person.user || null;
              if (userData) {
                if (userData.displayName) metaTitle = `${userData.displayName} | Sarasota Tech`;
                if (userData.bio) metaDesc = userData.bio;
                if (userData.featuredImageUrl) metaImage = userData.featuredImageUrl;
              }
              
              // Replace meta tags in HTML
              let updatedHtml = body
                .replace(/<title>.*?<\/title>/, `<title>${metaTitle}</title>`)
                .replace(/<meta name="title" content=".*?">/, `<meta name="title" content="${metaTitle}">`)
                .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${metaDesc}">`)
                .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${metaTitle}">`)
                .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${metaDesc}">`)
                .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${metaImage}">`)
                .replace(/<meta property="twitter:title" content=".*?">/, `<meta property="twitter:title" content="${metaTitle}">`)
                .replace(/<meta property="twitter:description" content=".*?">/, `<meta property="twitter:description" content="${metaDesc}">`)
                .replace(/<meta property="twitter:image" content=".*?">/, `<meta property="twitter:image" content="${metaImage}">`);
              
              console.log(`Updated meta tags for ${displayName}`);
              return originalSend.call(res, updatedHtml);
            } catch (error) {
              console.error("Error updating meta tags:", error);
              return originalSend.call(res, body);
            }
          };
          
          // Process HTML with async user data
          processHtmlWithUserData().catch(err => {
            console.error("Failed to process HTML with user data:", err);
            originalSend.call(res, body);
          });
          
          return undefined as any; // Async handling
        }
      }
      
      // For non-HTML or non-profile pages, just send the original response
      return originalSend.call(res, body);
    } as any;
    
    next();
  } catch (error) {
    console.error("Error in profileMetaTags middleware:", error);
    next();
  }
};