import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { insertUserSchema, people } from "@shared/schema";
import { z } from "zod";
import { sendVerificationEmail } from './email';

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const searchQuery = (req.query.search as string || '').toLowerCase();

      console.log("Fetching people from storage with search:", searchQuery);

      const allPeople = await db
        .select()
        .from(people)
        .where(
          searchQuery
            ? sql`(LOWER(user_name) LIKE ${`%${searchQuery}%`} OR LOWER(email) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .orderBy(people.id);

      console.log(`Total matching people: ${allPeople.length}`);

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

  app.get("/api/people/:id", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(person);
    } catch (error) {
      console.error('Failed to fetch person:', error);
      res.status(500).json({ error: "Failed to fetch person" });
    }
  });

  // Profile claiming endpoint
  app.post("/api/auth/claim-profile", async (req, res) => {
    try {
      console.log('Received claim profile request:', req.body);
      const { email, personId } = req.body;

      if (!email || !personId) {
        console.log('Missing required fields:', { email, personId });
        return res.status(400).json({ error: "Missing email or personId" });
      }

      // Normalize email to lowercase for consistent comparison
      const normalizedEmail = email.toLowerCase();

      // Get person by API ID first to validate the request
      const person = await storage.getPersonByApiId(personId);
      console.log('Found person:', person ? 'yes' : 'no', { personId });

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Ensure the email matches the person's record
      const emailsMatch = person.email.toLowerCase() === normalizedEmail;
      console.log('Email match check:', { 
        provided: normalizedEmail, 
        stored: person.email.toLowerCase(),
        matches: emailsMatch 
      });

      if (!emailsMatch) {
        return res.status(400).json({ error: "Email does not match the profile" });
      }

      // Check if profile is already claimed by checking email
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      console.log('Existing user check:', existingUser ? 'found' : 'not found');

      if (existingUser) {
        return res.status(400).json({ error: "Profile already claimed" });
      }

      // Create verification token using normalized email
      const verificationToken = await storage.createVerificationToken(normalizedEmail);
      console.log('Created verification token:', verificationToken.token);

      // Send verification email
      const emailSent = await sendVerificationEmail(normalizedEmail, verificationToken.token);

      if (!emailSent) {
        await storage.deleteVerificationToken(verificationToken.token);
        return res.status(500).json({ error: "Failed to send verification email" });
      }

      return res.json({ 
        message: "Verification email sent",
        // Only include token in development for testing
        token: process.env.NODE_ENV === 'development' ? verificationToken.token : undefined
      });
    } catch (error) {
      console.error('Failed to claim profile:', error);
      res.status(500).json({ error: "Failed to process profile claim" });
    }
  });

  // Verify token endpoint
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Missing verification token" });
      }

      const verificationToken = await storage.validateVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Get the person record by email
      const person = await storage.getPersonByEmail(verificationToken.email);
      if (!person) {
        return res.status(404).json({ error: "Associated person not found" });
      }

      // Create user record with normalized email
      const userData = {
        email: verificationToken.email.toLowerCase(),
        personId: person.id, // We still store the ID but don't rely on it for lookups
        displayName: person.userName || person.fullName || undefined,
      };

      const user = await storage.createUser(userData);

      // Verify the user
      await storage.verifyUser(user.id);

      // Clean up the verification token
      await storage.deleteVerificationToken(token);

      return res.json({ 
        message: "Email verified successfully",
        user
      });
    } catch (error) {
      console.error('Failed to verify token:', error);
      res.status(500).json({ error: "Failed to verify email" });
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

      try {
        // Clear tables within a transaction
        await db.transaction(async (tx) => {
          console.log('Starting transaction for database reset...');

          // First clear events as they don't have dependencies
          console.log('Clearing events table...');
          await storage.clearEvents();

          // Then clear people while preserving email relationships
          console.log('Clearing people table...');
          await storage.clearPeople();

          // Reset cache metadata
          console.log('Clearing cache metadata...');
          await tx.execute(sql`TRUNCATE TABLE cache_metadata RESTART IDENTITY`);

          console.log('Database cleared successfully. Tables reset to empty state with ID sequences reset.');
        });

        // Import CacheService to trigger a refresh
        const { CacheService } = await import('./services/CacheService');
        const cacheService = CacheService.getInstance();

        // Initialize a new sync from the beginning of time
        const oldestPossibleDate = new Date(0);
        await storage.setLastCacheUpdate(oldestPossibleDate);

        // Trigger the cache update process
        console.log('Triggering fresh data fetch from Luma API');
        await cacheService.updateCache();

        return res.json({ 
          success: true, 
          message: "Database reset completed. Fresh data sync from Luma API is in progress." 
        });
      } catch (error) {
        console.error('Transaction failed during database reset:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        throw error;
      }
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