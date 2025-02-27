import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

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

    if (endpoint === 'calendar/list-people' || endpoint === 'calendar/list-events') {
      // Log minimal information to track pagination progress
      console.log('Response details:', {
        endpoint,
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

  // Internal-only route to reset database and fetch fresh data from Luma
  // This is not exposed to the public API and should only be called directly from the server
  app.post("/_internal/reset-database", async (req, res) => {
    try {
      // Check if request is coming from localhost
      const requestIP = req.ip || req.socket.remoteAddress;
      const isLocalRequest = requestIP === '127.0.0.1' || requestIP === '::1' || requestIP === 'localhost';

      // Only allow this endpoint to be called from the local machine or development environment
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (!isLocalRequest && !isDevelopment) {
        console.warn(`Unauthorized database reset attempt from ${requestIP}`);
        return res.status(403).json({ error: "Forbidden. This endpoint is restricted to internal use only." });
      }

      console.log('Starting database reset process');

      // Clear both events and people tables
      await Promise.all([
        storage.clearEvents(),
        storage.clearPeople()
      ]);

      // Also reset cache metadata sequence
      await db.execute(sql`ALTER SEQUENCE cache_metadata_id_seq RESTART WITH 1`);

      console.log('Database cleared successfully. Tables reset to empty state with ID sequences reset.');

      // Import CacheService to trigger a refresh
      const { CacheService } = await import('./services/CacheService');
      const cacheService = CacheService.getInstance();

      // Clear the last update timestamp to force a full sync
      await storage.setLastCacheUpdate(null);

      // Trigger the cache update process
      console.log('Triggering fresh data fetch from Luma API');
      cacheService.updateCache();

      return res.json({ 
        success: true, 
        message: "Database reset initiated. Fresh data sync from Luma API is in progress." 
      });
    } catch (error) {
      console.error('Failed to reset database:', error);
      return res.status(500).json({ 
        error: "Failed to reset database", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  return createServer(app);
}