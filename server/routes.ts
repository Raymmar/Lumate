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

// Define validation schemas for user registration and verification
const registerUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).optional(),
  personId: z.number().int().positive()
});

const verifyEmailSchema = z.object({
  token: z.string()
});

// Email service for sending verification emails
const sendVerificationEmail = async (email: string, token: string) => {
  // In a production environment, you would integrate with an email service provider
  // For now, we'll just log the verification link
  const verificationLink = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  console.log(`Sending verification email to ${email} with link: ${verificationLink}`);
  return true;
};

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
      // Get page, limit and search from query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = (req.query.search as string) || '';
      
      console.log("Fetching people from storage..."); //Added progress tracking

      // Get all people from storage
      const allPeople = await storage.getPeople();
      console.log(`Total people in storage: ${allPeople.length}`);
      
      // Filter people if search parameter is provided
      let filteredPeople = allPeople;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPeople = allPeople.filter((person) => {
          return (
            person.userName?.toLowerCase().includes(searchLower) ||
            person.email.toLowerCase().includes(searchLower) ||
            person.fullName?.toLowerCase().includes(searchLower) ||
            person.organizationName?.toLowerCase().includes(searchLower) ||
            person.jobTitle?.toLowerCase().includes(searchLower)
          );
        });
        console.log(`Found ${filteredPeople.length} people matching search: "${search}"`);
      }

      // Calculate pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = filteredPeople.slice(start, end);
      console.log(`Returning people from index ${start} to ${end -1}`); //Added progress tracking

      res.json({
        people: paginatedPeople,
        total: filteredPeople.length
      });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // API routes for user authentication and account management

  // Get a person by email to check if they exist in Luma data
  app.get("/api/people/by-email", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const person = await storage.getPersonByEmail(email);
      if (!person) {
        return res.status(404).json({ error: "No person found with this email" });
      }

      res.json({ person });
    } catch (error) {
      console.error('Failed to find person by email:', error);
      res.status(500).json({ error: "Failed to find person" });
    }
  });

  // Register a new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body
      const result = registerUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: result.error.format() 
        });
      }

      const { email, displayName, personId } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      // Verify the person exists in Luma data
      const person = await storage.getPersonById(personId);
      if (!person) {
        return res.status(404).json({ error: "No person found with this ID" });
      }

      // Verify email matches the person's email in Luma data
      if (person.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ 
          error: "Email doesn't match the selected person's email" 
        });
      }

      // Create the user
      const newUser = await storage.createUser({
        email,
        displayName: displayName || person.userName || person.fullName || email.split('@')[0],
        personId
      });

      // Create verification token
      const verificationToken = await storage.createVerificationToken(email);

      // Send verification email
      await sendVerificationEmail(email, verificationToken.token);

      res.status(201).json({ 
        success: true,
        message: "User registered successfully. Please check your email to verify your account.",
        userId: newUser.id
      });
    } catch (error) {
      console.error('Failed to register user:', error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Verify email with token
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      // Validate request body
      const result = verifyEmailSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid token", 
          details: result.error.format() 
        });
      }

      const { token } = result.data;

      // Validate the token
      const verificationToken = await storage.validateVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Get the user by email
      const user = await storage.getUserByEmail(verificationToken.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Mark the user as verified
      const verifiedUser = await storage.verifyUser(user.id);

      // Delete the used token
      await storage.deleteVerificationToken(token);

      res.json({ 
        success: true, 
        message: "Email verified successfully", 
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
          isVerified: verifiedUser.isVerified
        }
      });
    } catch (error) {
      console.error('Failed to verify email:', error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Get current user profile (if they have a user account)
  app.get("/api/auth/profile", async (req, res) => {
    try {
      // In a real app, this would use a session or JWT token to identify the user
      // For demo purposes, we'll accept an email parameter
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get the user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get the linked person data
      const userWithPerson = await storage.getUserWithPerson(user.id);
      if (!userWithPerson) {
        return res.status(404).json({ error: "User profile not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        },
        person: userWithPerson.person
      });
    } catch (error) {
      console.error('Failed to get user profile:', error);
      res.status(500).json({ error: "Failed to get user profile" });
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
      
      // Start a full cache update to fetch fresh data from Luma
      console.log('Triggering fresh data fetch from Luma API');
      await cacheService.performInitialUpdate();
      
      return res.json({ 
        success: true, 
        message: "Database reset successful. Fresh data fetched from Luma API." 
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