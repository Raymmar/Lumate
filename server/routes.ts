import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { CacheService } from "./services/CacheService";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

export async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${LUMA_API_BASE}/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    if (!process.env.LUMA_API_KEY) {
      throw new Error('LUMA_API_KEY environment variable is not set');
    }

    console.log(`Making request to ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-luma-api-key': process.env.LUMA_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Luma API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Luma API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (endpoint === 'calendar/list-people') {
      console.log('Response details:', {
        currentBatch: data.entries?.length,
        hasMore: data.has_more,
        nextCursor: data.next_cursor
      });
    }

    return data;
}

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      console.log(`Retrieved ${events.length} events from storage`);

      res.json({
        events,
        total: events.length
      });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      console.log("Fetching people from storage...");

      const allPeople = await storage.getPeople();
      console.log(`Total people in storage: ${allPeople.length}`);

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = allPeople.slice(start, end);
      console.log(`Returning people from index ${start} to ${end -1}`);

      res.json({
        people: paginatedPeople,
        total: allPeople.length
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Add a test endpoint to trigger a sync and get stats
  app.post("/api/sync", async (_req, res) => {
    try {
      // Get initial counts
      const initialEvents = await storage.getEvents();
      const initialPeople = await storage.getPeople();

      console.log('Initial counts:', {
        events: initialEvents.length,
        people: initialPeople.length
      });

      // Trigger a sync
      await CacheService.getInstance().performInitialUpdate();

      // Get final counts
      const finalEvents = await storage.getEvents();
      const finalPeople = await storage.getPeople();

      console.log('Final counts:', {
        events: finalEvents.length,
        people: finalPeople.length
      });

      res.json({
        initial: {
          events: initialEvents.length,
          people: initialPeople.length
        },
        final: {
          events: finalEvents.length,
          people: finalPeople.length
        },
        changes: {
          events: finalEvents.length - initialEvents.length,
          people: finalPeople.length - initialPeople.length
        }
      });
    } catch (error) {
      console.error('Sync failed:', error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  return createServer(app);
}