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

  return await response.json();
}

// Function to sync event data from Luma to our database
async function syncEventToDatabase(eventData: any): Promise<void> {
  const event = {
    api_id: eventData.api_id,
    name: eventData.event?.name || eventData.name,
    description: eventData.event?.description || eventData.description,
    start_at: eventData.event?.start_at || eventData.start_at,
    end_at: eventData.event?.end_at || eventData.end_at,
    cover_url: eventData.event?.cover_url || eventData.cover_url,
    url: eventData.event?.url || eventData.url,
    geo_address_json: eventData.event?.geo_address_json || eventData.geo_address_json,
  };

  await storage.upsertEvent(event);
}

// Function to sync person data from Luma to our database
async function syncPersonToDatabase(personData: any): Promise<void> {
  const person = {
    api_id: personData.api_id,
    email: personData.email,
    name: personData.user?.name || null,
    avatar_url: personData.user?.avatar_url || null,
    website_url: personData.user?.website_url || null,
    linkedin_url: personData.user?.linkedin_url || null,
    total_events_attended: personData.stats?.total_events_attended || 0,
    total_spent: personData.stats?.total_spent || "0",
    is_host: personData.role === "host" || false,
  };

  await storage.upsertPerson(person);
}

export async function registerRoutes(app: Express) {
  // Sync all events from Luma API
  app.get("/api/sync/events", async (_req, res) => {
    try {
      const data = await lumaApiRequest('calendar/list-events');
      const events = data.entries || [];

      // Sync each event to our database
      await Promise.all(events.map(syncEventToDatabase));

      res.json({ message: "Events synced successfully" });
    } catch (error) {
      console.error('Failed to sync events:', error);
      res.status(500).json({ error: "Failed to sync events from Luma API" });
    }
  });

  // Sync all people from Luma API
  app.get("/api/sync/people", async (_req, res) => {
    try {
      let page = 1;
      let hasMore = true;
      const limit = 100;

      while (hasMore) {
        const data = await lumaApiRequest('calendar/list-people', {
          page: page.toString(),
          limit: limit.toString()
        });

        const people = data.entries || [];
        await Promise.all(people.map(syncPersonToDatabase));

        hasMore = page * limit < data.total;
        page++;
      }

      res.json({ message: "People synced successfully" });
    } catch (error) {
      console.error('Failed to sync people:', error);
      res.status(500).json({ error: "Failed to sync people from Luma API" });
    }
  });

  // Get events from local database
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get single event from local database
  app.get("/api/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEventByApiId(id);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Get people from local database with pagination
  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await storage.getPeople(page, limit);
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  return createServer(app);
}