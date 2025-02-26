import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

export async function lumaApiRequest(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${LUMA_API_BASE}/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    console.log(`Making request to ${url.toString()} with params:`, params);

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
      const errorText = await response.text();
      console.error(`Luma API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Luma API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Enhanced logging for pagination-related fields
    if (endpoint === 'calendar/list-people') {
      console.log('Response details:', {
        totalEntries: data.entries?.length,
        hasMore: data.has_more,
        nextCursor: data.next_cursor,
        requestParams: params
      });
    }

    return data;
  }

export async function registerRoutes(app: Express) {
  app.get("/api/events", async (_req, res) => {
    try {
      // Let's try to fetch events directly from Luma API first to verify the data
      const eventsData = await lumaApiRequest('calendar/list-events');
      console.log('Direct Luma API events data:', {
        hasData: !!eventsData,
        entriesCount: eventsData?.entries?.length,
        sampleEntry: eventsData?.entries?.[0]
      });

      // Then get events from our storage
      console.log('Fetching events from storage...');
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
      // Get page and limit from query parameters, default to first page with 50 items
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      console.log("Fetching people from storage..."); //Added progress tracking

      // Get all people from storage
      const allPeople = await storage.getPeople();
      console.log(`Total people in storage: ${allPeople.length}`);

      // Calculate pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = allPeople.slice(start, end);
      console.log(`Returning people from index ${start} to ${end -1}`); //Added progress tracking

      res.json({
        people: paginatedPeople,
        total: allPeople.length
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  return createServer(app);
}