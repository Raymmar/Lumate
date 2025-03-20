import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * This file handles server-side generation of meta tags for SEO and social media previews
 * It creates an API endpoint that serves OpenGraph meta tags for profile pages
 */

export async function registerSeoRoutes(app: any) {
  // Endpoint for person profile meta tags
  app.get("/api/seo/person/:username", async (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      console.log(`Generating SEO metadata for username: ${username}`);
      
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      // Try to find the person
      const decodedUsername = decodeURIComponent(username)
        .replace(/^dr-/, "Dr. ")
        .replace(/-/g, " ");
        
      console.log(`Looking up user: ${decodedUsername}`);
      
      const person = await storage.getPersonByUsername(decodedUsername);
      
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }
      
      // Prepare basic metadata
      const displayName = person.userName || person.fullName || username;
      const userBio = person.bio || null;
      let avatarUrl = person.avatarUrl || null;
      
      let metadata = {
        title: `${displayName} | Sarasota Tech`,
        description: userBio || `Member of the Sarasota Tech Community`,
        image: avatarUrl || "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg"
      };
      
      // Try to get additional user data if available
      // A person may have an associated user
      const userData = person.user || (person.id ? await storage.getUserWithPerson(person.id) : null);
      
      if (userData) {
        metadata = {
          title: `${userData.displayName || displayName} | Sarasota Tech`,
          description: userData.bio || userBio || `Member of the Sarasota Tech Community`,
          image: userData.featuredImageUrl || avatarUrl || "https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan%2725-109%20compressed.jpeg"
        };
        
        console.log(`Enhanced metadata with user data for ${userData.displayName || displayName}`);
      }
      
      // Generate HTML with meta tags for the crawler
      const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />

    <!-- Primary Meta Tags -->
    <title>${metadata.title}</title>
    <meta name="title" content="${metadata.title}">
    <meta name="description" content="${metadata.description}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/person/${username}">
    <meta property="og:title" content="${metadata.title}">
    <meta property="og:description" content="${metadata.description}">
    <meta property="og:image" content="${metadata.image}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${req.protocol}://${req.get('host')}/person/${username}">
    <meta property="twitter:title" content="${metadata.title}">
    <meta property="twitter:description" content="${metadata.description}">
    <meta property="twitter:image" content="${metadata.image}">
    
    <!-- Redirect to the actual page after bot consumes meta tags -->
    <meta http-equiv="refresh" content="0;url=/person/${username}">
  </head>
  <body>
    <p>Redirecting to <a href="/person/${username}">${metadata.title}</a>...</p>
  </body>
</html>
      `.trim();
      
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
      
    } catch (error) {
      console.error("Error generating SEO metadata:", error);
      return res.status(500).json({ error: "Failed to generate SEO metadata" });
    }
  });
}