import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';
const MAX_PAGES = 50; // Safety limit for pagination
const INITIAL_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

// Helper function to make Luma API requests with retry logic
async function lumaApiRequest(endpoint: string, params?: Record<string, string>, retryCount = 0): Promise<any> {
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

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-luma-api-key': process.env.LUMA_API_KEY
      }
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      console.log(`Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return lumaApiRequest(endpoint, params, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Luma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      console.log(`Request failed. Retrying after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return lumaApiRequest(endpoint, params, retryCount + 1);
    }
    throw error;
  }
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

  // Sync endpoint to fetch all people from Luma API and store in our database
  app.post("/api/people/sync", async (_req, res) => {
    try {
      let allPeople: any[] = [];
      let page = 1;
      let hasMore = true;
      let totalFetched = 0;

      console.log('Starting people sync from Luma API...');

      // Fetch all pages from Luma API with safety limit
      while (hasMore && page <= MAX_PAGES) {
        console.log(`Fetching page ${page}...`);
        const data = await lumaApiRequest('calendar/list-people', {
          page: page.toString(),
          limit: '50'
        });

        const people = data.entries || [];
        totalFetched += people.length;
        console.log(`Received ${people.length} people on page ${page}. Total fetched: ${totalFetched}`);

        allPeople = [...allPeople, ...people];
        hasMore = data.has_more;

        if (hasMore && page >= MAX_PAGES) {
          console.log(`Reached maximum page limit of ${MAX_PAGES}. Stopping pagination.`);
          break;
        }

        page++;

        // Add a larger delay between page fetches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`Syncing ${allPeople.length} people to database...`);
      await storage.syncPeople(allPeople);
      console.log('Sync completed successfully');

      res.json({ 
        message: "People synced successfully", 
        count: allPeople.length,
        pages: page - 1,
        maxPageReached: page >= MAX_PAGES
      });
    } catch (error) {
      console.error('Failed to sync people:', error);
      res.status(500).json({ error: "Failed to sync people from Luma API" });
    }
  });

  // Get people from our database with search and pagination
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