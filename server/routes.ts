import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

// Configure Luma API base URL and key
const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

if (!process.env.LUMA_API_KEY) {
  throw new Error('LUMA_API_KEY environment variable is not set');
}

// Helper function to make Luma API requests
async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${LUMA_API_BASE}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  console.log('Making request to Luma API:', url.toString());
  console.log('Using API key:', `${process.env.LUMA_API_KEY.substring(0, 4)}...`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-luma-api-key': process.env.LUMA_API_KEY
      }
    });

    const responseText = await response.text();
    console.log('Luma API response status:', response.status);
    console.log('Luma API response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Luma API response body:', responseText);

    if (!response.ok) {
      throw new Error(`Luma API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Luma API request failed:', error);
    throw error;
  }
}

// Function to sync event data from Luma to our database
async function syncEventToDatabase(eventData: any): Promise<void> {
  try {
    console.log('Syncing event:', JSON.stringify(eventData, null, 2));
    const event = {
      api_id: eventData.id,
      name: eventData.name || eventData.event?.name,
      description: eventData.description || eventData.event?.description,
      start_at: new Date(eventData.start_date || eventData.start_at || eventData.event?.start_at).toISOString(),
      end_at: new Date(eventData.end_date || eventData.end_at || eventData.event?.end_at).toISOString(),
      cover_url: eventData.cover_image_url || eventData.cover_url || eventData.event?.cover_url,
      url: eventData.url || eventData.event?.url,
      geo_address_json: eventData.location ? JSON.stringify(eventData.location) : null
    };

    await storage.upsertEvent(event);
  } catch (error) {
    console.error('Failed to sync event:', error);
    throw error;
  }
}

// Function to sync person data from Luma to our database
async function syncPersonToDatabase(personData: any): Promise<void> {
  try {
    console.log('Syncing person:', JSON.stringify(personData, null, 2));
    const person = {
      api_id: personData.id,
      email: personData.email,
      name: personData.name || personData.user?.name || null,
      avatar_url: personData.avatar_url || personData.user?.avatar_url || null,
      website_url: personData.website_url || personData.user?.website_url || null,
      linkedin_url: personData.linkedin_url || personData.user?.linkedin_url || null,
      total_events_attended: personData.events_attended || personData.total_events_attended || 0,
      total_spent: (personData.total_spent || 0).toString(),
      is_host: personData.role === 'host' || personData.is_host || false,
    };

    await storage.upsertPerson(person);
  } catch (error) {
    console.error('Failed to sync person:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express) {
  // Sync all events from Luma API
  app.get("/api/sync/events", async (_req, res) => {
    try {
      console.log('Fetching events from Luma API...');
      const data = await lumaApiRequest('calendar/list-events');
      console.log('Events data from Luma:', JSON.stringify(data, null, 2));

      const events = data.events || data.data || [];

      // Sync each event to our database
      await Promise.all(events.map(syncEventToDatabase));

      res.json({ 
        message: "Events synced successfully", 
        count: events.length 
      });
    } catch (error) {
      console.error('Failed to sync events:', error);
      res.status(500).json({ 
        error: "Failed to sync events from Luma API", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Sync all people from Luma API
  app.get("/api/sync/people", async (_req, res) => {
    try {
      let allPeople: any[] = [];
      let hasMore = true;
      let page = 1;
      const limit = 100;

      console.log('Starting to fetch people from Luma API...');
      while (hasMore) {
        console.log(`Fetching page ${page} of people...`);
        const data = await lumaApiRequest('calendar/list-people', {
          page: page.toString(),
          limit: limit.toString()
        });
        console.log(`Fetched page ${page} data:`, JSON.stringify(data, null, 2));

        const people = data.members || data.data || [];
        allPeople = allPeople.concat(people);

        // Sync each batch of people to our database
        await Promise.all(people.map(syncPersonToDatabase));

        hasMore = data.has_more || false;
        page++;
      }

      res.json({ 
        message: "People synced successfully", 
        count: allPeople.length 
      });
    } catch (error) {
      console.error('Failed to sync people:', error);
      res.status(500).json({ 
        error: "Failed to sync people from Luma API", 
        details: error instanceof Error ? error.message : String(error)
      });
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