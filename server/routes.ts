import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

// Helper function to make Luma API requests
async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${LUMA_API_BASE}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  console.log(`Making request to ${url}`);

  if (!process.env.LUMA_API_KEY) {
    throw new Error('LUMA_API_KEY environment variable is not set');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-luma-api-key': process.env.LUMA_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Luma API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      const data = await lumaApiRequest('calendar/list-events');
      const events = data.entries || [];
      res.json(events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events from Luma API" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = await lumaApiRequest('event/get', { api_id: id });
      res.json(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      res.status(500).json({ error: "Failed to fetch event details from Luma API" });
    }
  });

  // New endpoint to sync people from Luma API to our database
  app.post("/api/people/sync", async (_req, res) => {
    try {
      let allPeople: any[] = [];
      let page = 1;
      let hasMore = true;

      // Fetch all pages from Luma API
      while (hasMore) {
        const data = await lumaApiRequest('calendar/list-people', {
          page: page.toString(),
          limit: '50'
        });

        const people = data.entries || [];
        allPeople = [...allPeople, ...people];

        hasMore = data.has_more;
        page++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Sync all people to our database
      await storage.syncPeople(allPeople);

      res.json({ message: "People synced successfully", count: allPeople.length });
    } catch (error) {
      console.error('Failed to sync people:', error);
      res.status(500).json({ error: "Failed to sync people from Luma API" });
    }
  });

  // Updated endpoint to get people from our database with search and pagination
  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const search = req.query.search as string | undefined;

      const result = await storage.getPeople(page, limit, search);
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people from database" });
    }
  });

  return createServer(app);
}