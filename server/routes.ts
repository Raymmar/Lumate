import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { insertUserSchema, people, updatePasswordSchema, users, roles as rolesTable, permissions as permissionsTable, rolePermissions as rolePermissionsTable } from "@shared/schema"; // Added import for users table and roles and permissions tables
import { z } from "zod";
import { sendVerificationEmail } from './email';
import { hashPassword, comparePasswords } from './auth';
import { ZodError } from 'zod';
import { events, attendance } from '@shared/schema'; //Import events schema and attendance schema
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { eq, and } from 'drizzle-orm';
import multer from 'multer';
import { fileStorage } from './services/FileStorageService';
import path from 'path';

// Add new interface for Post at the top of the file after imports
interface Post {
  id: number;
  title: string;
  summary: string | null;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Add SSE helper function at the top of the file
function initSSE(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
}

function sendSSEUpdate(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const LUMA_API_BASE = 'https://api.lu.ma/public/v1';

export async function lumaApiRequest(
  endpoint: string, 
  params?: Record<string, string>,
  options: { method?: string; body?: string } = {}
) {
    const url = new URL(`${LUMA_API_BASE}/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    if (!process.env.LUMA_API_KEY) {
      throw new Error('LUMA_API_KEY environment variable is not set');
    }

    console.log(`Making ${options.method || 'GET'} request to ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-luma-api-key': process.env.LUMA_API_KEY
      },
      ...(options.body ? { body: options.body } : {})
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
  // Set up session handling
  const PostgresStore = connectPg(session);

  // Get environment information
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(session({
    store: new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    name: 'sid',
    proxy: isProduction
  }));

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

  app.post("/api/events/rsvp", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { event_api_id } = req.body;
      if (!event_api_id) {
        return res.status(400).json({ error: "Missing event_api_id" });
      }

      // Get user's email and person record
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.personId) {
        return res.status(401).json({ error: "User not found" });
      }

      const person = await storage.getPerson(user.personId);
      if (!person) {
        return res.status(401).json({ error: "Associated person not found" });
      }

      // Make request to Luma API with correct body structure
      const response = await lumaApiRequest(
        'event/add-guests',
        undefined, // no query params needed
        {
          method: 'POST',
          body: JSON.stringify({
            guests: [{ email: user.email }],
            event_api_id
          })
        }
      );

      // Update cached status
      await storage.upsertRsvpStatus({
        userApiId: person.api_id,
        eventApiId: event_api_id,
        status: 'approved' // When RSVP is successful, status is always approved
      });

      console.log('Successfully RSVP\'d to event:', {
        eventId: event_api_id,
        userEmail: user.email
      });

      res.json({ message: 'Successfully RSVP\'d to event' });
    } catch (error) {
      console.error('Failed to RSVP to event:', error);
      res.status(500).json({ 
        error: "Failed to RSVP to event",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });


  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const searchQuery = (req.query.search as string || '').toLowerCase();
      const sort = req.query.sort as string;

      console.log("Fetching people from storage with search:", searchQuery, "sort:", sort);

      // First get attendance counts
      const attendanceCounts = await db.execute(sql`
        WITH attendance_counts AS (
          SELECT 
            LOWER(user_email) as email,
            COUNT(DISTINCT event_api_id) as event_count,
            MAX(registered_at) as last_attended
          FROM attendance
          GROUP BY LOWER(user_email)
        )
        SELECT * FROM attendance_counts
      `);

      // Create a lookup map for quick access
      const countMap = new Map(
        attendanceCounts.rows.map((row: any) => [row.email.toLowerCase(), row])
      );

      let query = db
        .select()
        .from(people)
        .where(
          searchQuery
            ? sql`(LOWER(user_name) LIKE ${`%${searchQuery}%`} OR LOWER(email) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        );

      // Add sorting based primarily on event attendance count
      if (sort === 'events') {
        const allPeople = await query;

        // Sort people by their actual attendance count
        const sortedPeople = allPeople.sort((a, b) => {
          const aCount = countMap.get(a.email.toLowerCase())?.event_count || 0;
          const bCount = countMap.get(b.email.toLowerCase())?.event_count || 0;

          if (bCount !== aCount) {
            return bCount - aCount; // Sort by count first
          }

          // If counts are equal, sort by most recent attendance
          const aDate = countMap.get(a.email.toLowerCase())?.last_attended || '1970-01-01';
          const bDate = countMap.get(b.email.toLowerCase())?.last_attended || '1970-01-01';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

        // Apply pagination
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedPeople = sortedPeople.slice(start, end);

        console.log(`Returning sorted people from index ${start} to ${end -1}`);

        res.json({
          people: paginatedPeople,
          total: sortedPeople.length
        });
        return;
      }

      // If not sorting by events, use default ordering
      const allPeople = await query.orderBy(people.id);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = allPeople.slice(start, end);

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

  // Add new endpoint for person attendance stats
  app.get("/api/people/:id/stats", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Count number of events attended
      const attendanceCount = await db
        .select({ count: sql`count(*)` })
        .from(attendance)
        .where(person.id ? eq(attendance.personId, person.id) : sql`1=0`); // Handle missing person.id

      res.json({
        attendanceCount: Number(attendanceCount[0]?.count || 0),
        firstSeen: person.createdAt
      });
    } catch (error) {
      console.error('Failed to fetch person stats:', error);
      res.status(500).json({ error: "Failed to fetch person stats" });
    }
  });

  // Add new endpoint for fetching events attended by a person
  app.get("/api/people/:id/events", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Get all events attended by the person through attendance records
      const attendedEvents = await db
        .select({
          id: events.id,
          api_id: events.api_id,
          title: events.title,
          description: events.description,
          startTime: events.startTime,
          endTime: events.endTime,
          coverUrl: events.coverUrl,
          url: events.url
        })
        .from(attendance)
        .innerJoin(events, eq(attendance.eventApiId, events.api_id))
        .where(eq(attendance.userEmail, person.email)) // Use email as it's the persistent identifier
        .orderBy(sql`start_time DESC`); // Changed to DESC for most recent first

      res.json(attendedEvents);
    } catch (error) {
      console.error('Failed to fetch attended events:', error);
      res.status(500).json({ error: "Failed to fetch attended events" });
    }
  });

  app.get("/api/auth/check-profile/:id", async (req, res) => {
    try {
      const personId = req.params.id;

      // Get person by API ID
      const person = await storage.getPersonByApiId(personId);
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // Check if there's a user with matching email
      const user = await storage.getUserByEmail(person.email.toLowerCase());

      return res.json({
        isClaimed: !!user,
        email: user ? user.email : null
      });
    } catch (error) {
      console.error('Failed to check profile status:', error);
      res.status(500).json({ error: "Failed to check profile status" });
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

      // First validate the token
      const verificationToken = await storage.validateVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Get the person record by email
      const person = await storage.getPersonByEmail(verificationToken.email);
      if (!person) {
        return res.status(404).json({ error: "Associated person not found" });
      }

      // Create initial user record with normalized email
      const userData = {
        email: verificationToken.email.toLowerCase(),
        personId: person.id,
        displayName: person.userName || person.fullName || undefined,
        isVerified: false // Will be set to true after password is set
      };

      // Create or get existing user
      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        user = await storage.createUser(userData);
      }

      // Don't delete token yet - we'll need it valid for password setting
      return res.json({ 
        message: "Email verified. Please set your password.",
        requiresPassword: true,
        email: verificationToken.email
      });
    } catch (error) {
      console.error('Failed to verify token:', error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Route to handle password creation after verification
  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }

      // Validate password
      const validatedPassword = updatePasswordSchema.parse({ password });

      // Get user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await hashPassword(validatedPassword.password);

      // Update user's password and set verified to true
      const updatedUser = await storage.updateUserPassword(user.id, hashedPassword);

      // Now verify the user since they've set their password
      const verifiedUser = await storage.verifyUser(updatedUser.id);

      // Clean up any verification tokens for this email
      await storage.deleteVerificationTokensByEmail(email.toLowerCase());

      return res.json({ 
        message: "Password set successfully",
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
          isVerified: verifiedUser.isVerified
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Invalid password",
          details: error.errors 
        });
      }
      console.error('Failed to set password:', error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  // Add user info endpoint
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Get the linked person's api_id if it exists
      let api_id = null;
      if (user.personId) {
        const person = await storage.getPerson(user.personId);
        if (person) {
          api_id = person.api_id;
        }
      }

      // Explicitly include all necessary user fields including isAdmin
      return res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin, // Explicitly include isAdmin
        personId: user.personId,
        api_id
      });
    } catch (error) {
      console.error('Failed to get user info:', error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Update login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(401).json({ error: "Password not set" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ error: "Email not verified" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set up session
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });

      // Explicitly include isAdmin in the response
      return res.json({ 
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin, // Explicitly include isAdmin
          personId: user.personId
        }
      });
    } catch (error) {
      console.error('Login failed:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Update logout route
  app.post("/api/auth/logout", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout failed:', err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Internal-only route to reset database and fetch fresh data from Luma
  app.post("/_internal/reset-database", async (req, res) => {
    try {
      // Check if request is coming from localhost
      const requestIP = req.ip || req.socket.remoteAddress;
      const isLocalRequest = requestIP === '127.0.0.1' || requestIP === '::1' || requestIP === 'localhost';
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (!isLocalRequest && !isDevelopment) {
        console.warn(`Unauthorized database reset attempt from ${requestIP}`);
        return res.status(403).json({ error: "Forbidden. This endpoint is restricted to internal use only." });
      }

      // Initialize SSE
      initSSE(res);
      sendSSEUpdate(res, { 
        type: 'status', 
        message: 'Starting database reset process',
        progress: 0 
      });

      try {
        // Clear events table
        sendSSEUpdate(res, { 
          type: 'status', 
          message: 'Clearing events table...',
          progress: 5 
        });
        await storage.clearEvents();

        // Clear people table
        sendSSEUpdate(res, { 
          type: 'status', 
          message: 'Clearing people table (preserving user relationships)...',
          progress: 10 
        });
        await storage.clearPeople();

        // Clear cache metadata
        sendSSEUpdate(res, { 
          type: 'status', 
          message: 'Clearing cache metadata...',
          progress: 15 
        });
        await db.execute(sql`TRUNCATE TABLE cache_metadata RESTART IDENTITY`);

        // Import CacheService
        const { CacheService } = await import('./services/CacheService');
        const cacheService = CacheService.getInstance();

        // Initialize sync
        sendSSEUpdate(res, { 
          type: 'status', 
          message: 'Initializing fresh data fetch from Luma API',
          progress: 20 
        });

        // Set up event listeners for cache service
        cacheService.on('fetchProgress', (data) => {
          sendSSEUpdate(res, {
            type: 'progress',
            ...data
          });
        });

        // Initialize a new sync
        const oldestPossibleDate = new Date(0);
        await storage.setLastCacheUpdate(oldestPossibleDate);

        // Start the cache update
        await cacheService.updateCache();

        // Verify data was fetched
        const [eventCount, peopleCount] = await Promise.all([
          storage.getEventCount(),
          storage.getPeopleCount()
        ]);

        if (eventCount === 0 && peopleCount === 0) {
          throw new Error('No data was fetched from Luma API');
        }

        // Send final success message
        sendSSEUpdate(res, { 
          type: 'complete',
          message: `Database reset completed. Successfully fetched ${eventCount} events and ${peopleCount} people from Luma API.`,
          data: {
            eventCount,
            peopleCount
          },
          progress: 100
        });

        // End the SSE stream
        res.end();

      } catch (error) {
        console.error('Failed during database reset:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        sendSSEUpdate(res, {
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
          progress: 0
        });
        res.end();
        throw error;
      }
    } catch (error) {
      console.error('Failed to reset database:', error);
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: "Failed to reset database", 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  });

  // Add the new admin stats endpoint after the existing routes
  app.get("/api/admin/stats", async (req, res) => {
    try {
      // Get the authenticated user
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is admin using the new flag
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Fetch stats
      const [eventCount, peopleCount, userCount, totalAttendeesCount] = await Promise.all([
        storage.getEventCount(),
        storage.getPeopleCount(),
        storage.getUserCount(),
        storage.getTotalAttendeesCount()
      ]);

      res.json({
        events: eventCount,
        people: peopleCount,
        users: userCount,
        uniqueAttendees: peopleCount, 
        totalAttendees: totalAttendeesCount, 
        paidUsers: 0 
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/events/check-rsvp", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { event_api_id } = req.query;
      if (!event_api_id) {
        return res.status(400).json({ error: "Missing event_api_id" });
      }

      // Get user's email and linked person record for api_id
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.personId) {
        return res.status(401).json({ error: "User not found" });
      }

      const person = await storage.getPerson(user.personId);
      if (!person) {
        return res.status(401).json({ error: "Associated person not found" });
      }

      // First check cached status
      const cachedStatus = await storage.getRsvpStatus(person.api_id, event_api_id as string);
      if (cachedStatus) {
        return res.json({
          isGoing: cachedStatus.status === 'approved',
          status: cachedStatus.status
        });
      }

      // If no cached status, check with Luma API
      const response = await lumaApiRequest(
        'event/get-guest',
        { 
          event_api_id: event_api_id as string,
          email: user.email 
        }
      );

      console.log('Checked RSVP status:', {
        eventId: event_api_id,
        userEmail: user.email,
        status: response.guest?.approval_status,
        fullResponse: response
      });

      // Cache the response
      if (response.guest?.approval_status) {
        await storage.upsertRsvpStatus({
          userApiId: person.api_id,
          eventApiId: event_api_id as string,
          status: response.guest.approval_status
        });
      }

      res.json({ 
        isGoing: response.guest?.approval_status === 'approved',
        status: response.guest?.approval_status
      });
    } catch (error) {
      console.error('Failed to check RSVP status:', error);
      res.status(500).json({ 
        error: "Failed to check RSVP status",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add new featured event endpoint
  app.get("/api/events/featured", async (_req, res) => {
    try {
      const featuredEvent = await storage.getFeaturedEvent();

      if (!featuredEvent) {
        return res.status(404).json({ error: "No featured event found" });
      }

      res.json(featuredEvent);
    } catch (error) {
      console.error('Failed to fetch featured event:', error);
      res.status(500).json({ error: "Failed to fetch featured event" });
    }
  });

  // Update the /api/admin/events endpoint
  app.get("/api/admin/events", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get pagination parameters and search query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = (req.query.search as string || '').toLowerCase();
      const offset = (page - 1) * limit;

      // Get total count with search filter
      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .then(result => Number(result[0].count));

      // Get paginated events with search filter
      const eventsList = await db
        .select()
        .from(events)
        .where(
                    searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`
        )
        .orderBy(sql`start_time DESC`)
        .limit(limit)
        .offset(offset);

    // Get attendance status for each event
    const eventsWithStatus = await Promise.all(
      eventsList.map(async (event) => {
        const attendanceStatus = await storage.getEventAttendanceStatus(event.api_id);
        return {
          ...event,
          isSynced: attendanceStatus.hasAttendees,
          lastSyncedAt: attendanceStatus.lastSyncTime,
          lastAttendanceSync: event.lastAttendanceSync || attendanceStatus.lastSyncTime
        };
      })
    );

    res.json({
      events: eventsWithStatus,
      total: totalCount
    });
  } catch (error) {
    console.error('Failed to fetch admin events:', error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Update the /api/admin/people endpoint with search
app.get("/api/admin/people", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get pagination parameters and search query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const searchQuery = (req.query.search as string || '').toLowerCase();
    const offset = (page - 1) * limit;

    // Get total count with search filter
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(people)
      .where(
        searchQuery
          ? sql`(
              LOWER(user_name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(email) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(organization_name, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(job_title, '')) LIKE ${`%${searchQuery}%`}
            )`
          : sql`1=1`
      )
      .then(result => Number(result[0].count));

    // Get paginated people with search filter
    const peopleList = await db
      .select()
      .from(people)
      .where(
        searchQuery
          ? sql`(
              LOWER(user_name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(email) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(organization_name, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(job_title, '')) LIKE ${`%${searchQuery}%`}
            )`
          : sql`1=1`
      )
      .orderBy(people.id)
      .limit(limit)
      .offset(offset);

    res.json({
      people: peopleList,
      total: totalCount
    });
  } catch (error) {
    console.error('Failed to fetch people:', error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Modify the existing /api/admin/events/:eventId/guests endpoint
app.get("/api/admin/events/:eventId/guests", async (req, res) => {
  try {
    // Authentication checks remain unchanged...
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(400).json({ error: "Missing event ID" });
    }

    let allGuests: any[] = [];
    let hasMore = true;
    let cursor = undefined;
    let iterationCount = 0;      const MAX_ITERATIONS = 100; // Safety limit

    console.log('Starting guest sync for event:', eventId);

    // First, delete all existing attendance records for this event
    try {
      await storage.deleteAttendanceByEvent(eventId);
      console.log('Cleared existing attendance records for event:', eventId);
    } catch (error) {
      console.error('Failed to clear existing attendance records:', error);
      throw error;
    }

    while (hasMore && iterationCount < MAX_ITERATIONS) {
      const params: Record<string, string> = { 
        event_api_id: eventId 
      };

      if (cursor) {
        params.pagination_cursor = cursor;
      }

      console.log('Fetching guests with params:', params);
      const response = await lumaApiRequest('event/get-guests', params);

      console.log('Response details:', {
        currentBatch: response.entries?.length,
        hasMore: response.has_more,
        nextCursor: response.next_cursor
      });

      if (response.entries) {
        // Filter for approved guests only and store their attendance records
        const approvedEntries = response.entries.filter((entry: any) => entry.guest.approval_status === 'approved');

        for (const entry of approvedEntries) {
          const guest = entry.guest;
          console.log('Processing approved guest:', {
            guestId: guest.api_id,
            email: guest.email,
            status:guest.approval_status,
            registeredAt: guest.registered_at
          });

          try {
            await storage.upsertAttendance({
              eventApiId: eventId,
              userEmail: guest.email.toLowerCase(),
              guestApiId: guest.api_id,
              approvalStatus: guest.approval_status,
              registeredAt: guest.registered_at
            });
            console.log('Successfully stored attendance for guest:', guest.api_id);            } catch (error) {
            console.error('Failed to store attendance for guest:', {
              guestId: guest.api_id,
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        }

        allGuests = allGuests.concat(approvedEntries);
      }

      hasMore = response.has_more;
      cursor = response.next_cursor;
      iterationCount++;

      console.log('Pagination status:', {
        iteration: iterationCount,
        guestsCollected: allGuests.length,
        hasMore,
        cursor
      });
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn('Reached maximum iteration limit while syncing guests');
    }

    // Update the event's last sync timestamp
    await storage.updateEventAttendanceSync(eventId);

    console.log('Completed guest sync:', {
      eventId,
      totalGuests: allGuests.length,
      totalIterations: iterationCount
    });

    res.json({
      guests: allGuests,
      total: allGuests.length
    });
  } catch (error) {
    console.error('Failed to fetch event guests:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    res.status(500).json({ 
      error: "Failed to fetch event guests",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get attendees for a specific event
app.get("/api/admin/events/:eventId/attendees", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(400).json({ error: "Missing event ID" });
    }

    // Query attendance records and join with people table
    const result = await db
      .select({
        id: people.id,
        userName: people.userName,
        email: people.email,
        avatarUrl: people.avatarUrl,
        api_id: people.api_id,
      })
      .from(attendance)
      .innerJoin(people, eq(attendance.userEmail, people.email))
      .where(eq(attendance.eventApiId, eventId))
      .orderBy(attendance.registeredAt);

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch event attendees:', error);
    res.status(500).json({ error: "Failed to fetch attendees" });
  }
});

app.post("/api/events/send-invite", async (req, res) => {
  try {
    const { email, event_api_id } = req.body;

    if (!email || !event_api_id) {
      return res.status(400).json({ error: "Missing email or event_api_id" });
    }

    console.log('Sending invite for event:', {
      eventId: event_api_id,
      userEmail: email
    });

    const response = await lumaApiRequest(
      'event/send-invites',
      undefined, // no query params needed
      {
        method: 'POST',
        body: JSON.stringify({
          guests: [{ email }],
          event_api_id
        })
      }
    );

    console.log('Invite sent successfully:', {
      eventId: event_api_id,
      userEmail: email,
      response
    });

    res.json({ 
      message: "Invite sent successfully. Please check your email.",
      details: response
    });
  } catch (error) {
    console.error('Failed to send invite:', error);
    res.status(500).json({ 
      error: "Failed to send invite",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Add the new public posts endpoint
app.get("/api/public/posts", async (_req, res) => {
  try {
    console.log('Fetching public posts...');
    const posts = await storage.getPosts();

    // Sort posts with pinned posts first, then by creation date
    const sortedPosts = posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`Retrieved ${posts.length} public posts`);
    res.json({ posts: sortedPosts });
  } catch (error) {
    console.error('Failed to fetch public posts:', error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Add the posts endpoints
app.post("/api/admin/posts", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const postData = req.body;

    // Add the creator ID to the post data
    postData.creatorId = user.id;

    // Create the post
    const post = await storage.createPost(postData);

    res.json(post);
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.get("/api/admin/posts", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const posts = await storage.getPosts();
    res.json({ posts });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Update admin check in /api/admin/members endpoint
app.get("/api/admin/members", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const searchQuery = (req.query.search as string || '').toLowerCase();
    const offset = (page - 1) * limit;

    // Get total count with search filter
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        searchQuery
          ? sql`(LOWER(email) LIKE ${`%${searchQuery}%`} OR LOWER(display_name) LIKE ${`%${searchQuery}%`})`
          : sql`1=1`
      )
      .then(result => Number(result[0].count));

    // Get paginated users with their linked person data
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isVerified: users.isVerified,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        person: people
      })
      .from(users)
      .leftJoin(people, eq(users.personId, people.id))
      .where(
        searchQuery
          ? sql`(LOWER(${users.email}) LIKE ${`%${searchQuery}%`} OR LOWER(${users.displayName}) LIKE ${`%${searchQuery}%`})`
          : sql`1=1`
      )
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset);

    res.json({
      users: usersList,
      total: totalCount
    });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// Add new endpoint to toggle admin status
app.post("/api/admin/users/:id/toggle-admin", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if the current user is an admin
    const currentUser = await storage.getUser(req.session.userId);
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const targetUserId = parseInt(req.params.id);
    const targetUser = await storage.getUser(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`Toggling admin status for user ${targetUserId} from ${targetUser.isAdmin} to ${!targetUser.isAdmin}`);

    // Toggle the admin status
    const updatedUser = await storage.updateUserAdminStatus(targetUserId, !targetUser.isAdmin);

    console.log(`Admin status for user ${targetUserId} updated successfully. New status: ${updatedUser.isAdmin}`);
    res.json(updatedUser);
  } catch (error) {
    console.error('Failed to toggle admin status:', error);
    res.status(500).json({ error: "Failed to toggle admin status" });
  }
});
// Add new roles and permissions endpoints after existing admin routes
app.get("/api/admin/roles", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get all roles
    const roles = await db
      .select()
      .from(rolesTable)
      .orderBy(rolesTable.id);

    console.log('Fetched roles:', roles);
    res.json(roles);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

app.get("/api/admin/permissions", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get all permissions
    const permissions = await db
      .select()
      .from(permissionsTable)
      .orderBy(permissionsTable.id);

    console.log('Fetched permissions:', permissions);
    res.json(permissions);
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

// Get permissions for a specific role
app.get("/api/admin/roles/:id/permissions", async (req, res) => {
  try {
    if (!req.session.userId) {
      console.log('Unauthorized access attempt - no session userId');
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      console.log('Unauthorized access attempt - not admin:', { userId: req.session.userId });
      return res.status(403).json({ error: "Not authorized" });
    }

    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      console.log('Invalid role ID:', req.params.id);
      return res.status(400).json({ error: "Invalid role ID" });
    }

    console.log('Fetching permissions for role:', roleId);

    // Get permissions for the specified role
    const rolePermissions = await db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        resource: permissionsTable.resource,
        action: permissionsTable.action
      })
      .from(rolePermissionsTable)
      .innerJoin(
        permissionsTable, 
        eq(permissionsTable.id, rolePermissionsTable.permissionId)
      )
      .where(eq(rolePermissionsTable.roleId, roleId));

    console.log('Role permissions found:', {
      roleId,
      permissionsCount: rolePermissions.length,
      permissions: rolePermissions.map(p => ({ id: p.id, name: p.name }))
    });

    res.json(rolePermissions);
  } catch (error) {
    console.error('Failed to fetch role permissions:', error);
    res.status(500).json({ error: "Failed to fetch role permissions" });
  }
});

// Add a permission to a role
app.post("/api/admin/roles/:roleId/permissions/:permissionId", async (req, res) => {
  try {
    if (!req.session.userId) {
      console.log('Unauthorized access attempt - no session userId');
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      console.log('Unauthorized access attempt - not admin:', { userId: req.session.userId });
      return res.status(403).json({ error: "Not authorized" });
    }

    const roleId = parseInt(req.params.roleId);
    const permissionId = parseInt(req.params.permissionId);

    if (isNaN(roleId) || isNaN(permissionId)) {
      console.log('Invalid role or permission ID:', { roleId: req.params.roleId, permissionId: req.params.permissionId });
      return res.status(400).json({ error: "Invalid role or permission ID" });
    }

    // Get role and permission details for validation
    const [role, permission] = await Promise.all([
      db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1),
      db.select().from(permissionsTable).where(eq(permissionsTable.id, permissionId)).limit(1)
    ]);

    if (!role[0] || !permission[0]) {
      console.log('Role or permission not found:', { roleId, permissionId });
      return res.status(404).json({ error: "Role or permission not found" });
    }

    console.log('Adding permission to role:', { 
      roleId, 
      roleName: role[0].name,
      permissionId,
      permissionName: permission[0].name
    });

    // Check if the role-permission combination already exists
    const existing = await db
      .select()
      .from(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permissionId)
        )
      );

    if (existing.length > 0) {
      console.log('Permission already exists for role:', { roleId, permissionId });
      return res.status(409).json({ error: "Permission already assigned to role" });
    }

    // Add permission to role
    await db.insert(rolePermissionsTable).values({
      roleId,
      permissionId,
      grantedBy: req.session.userId,
      grantedAt: new Date().toISOString()
    });

    console.log('Successfully added permission to role');

    // Get updated permissions for the role
    const updatedPermissions = await db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        resource: permissionsTable.resource,
        action: permissionsTable.action
      })
      .from(rolePermissionsTable)
      .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissionsTable.permissionId))
      .where(eq(rolePermissionsTable.roleId, roleId));

    console.log('Updated permissions:', {
      roleId,
      roleName: role[0].name,
      permissionsCount: updatedPermissions.length,
      permissions: updatedPermissions.map(p => ({ id: p.id, name: p.name }))
    });

    res.json(updatedPermissions);
  } catch (error) {
    console.error('Failed to assign permission to role:', error);
    res.status(500).json({ error: "Failed to assign permission to role" });
  }
});

// Remove a permission from a role
app.delete("/api/admin/roles/:roleId/permissions/:permissionId", async (req, res) => {
  try {
    if (!req.session.userId) {
      console.log('Unauthorized access attempt - no session userId');
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      console.log('Unauthorized access attempt - not admin:', { userId: req.session.userId });
      return res.status(403).json({ error: "Not authorized" });
    }

    const roleId = parseInt(req.params.roleId);
    const permissionId = parseInt(req.params.permissionId);

    if (isNaN(roleId) || isNaN(permissionId)) {
      console.log('Invalid role or permission ID:', { roleId: req.params.roleId, permissionId: req.params.permissionId });
      return res.status(400).json({ error: "Invalid role or permission ID" });
    }

    // Get role and permission details for validation
    const [role, permission] = await Promise.all([
      db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1),
      db.select().from(permissionsTable).where(eq(permissionsTable.id, permissionId)).limit(1)
    ]);

    if (!role[0] || !permission[0]) {
      console.log('Role or permission not found:', { roleId, permissionId });
      return res.status(404).json({ error: "Role or permission not found" });
    }

    console.log('Removing permission from role:', { 
      roleId, 
      roleName: role[0].name,
      permissionId,
      permissionName: permission[0].name
    });

    // Remove permission from role
    const result = await db
      .delete(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permissionId)
        )
      )
      .returning();

    console.log('Delete operation result:', result);

    // Get updated permissions for the role
    const updatedPermissions = await db
      .select({
        id: permissionsTable.id,
        name: permissionsTable.name,
        description: permissionsTable.description,
        resource: permissionsTable.resource,
        action: permissionsTable.action
      })
      .from(rolePermissionsTable)
      .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissionsTable.permissionId))
      .where(eq(rolePermissionsTable.roleId, roleId));

    console.log('Updated permissions after removal:', {
      roleId,
      roleName: role[0].name,
      permissionsCount: updatedPermissions.length,
      permissions: updatedPermissions.map(p => ({ id: p.id, name: p.name }))
    });

    res.json(updatedPermissions);
  } catch (error) {
    console.error('Failed to remove permission from role:', error);
    res.status(500).json({ error: "Failed to remove permission from role" });
  }
});

// Add user role management endpoint
app.post("/api/admin/members/:userId/roles/:roleName", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin
    const adminUser = await storage.getUser(req.session.userId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const userId = parseInt(req.params.userId);
    const roleName = req.params.roleName;
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    console.log(`Updating roles for user ${userId} to role ${roleName} by admin ${req.session.userId}`);

    // Get the role by name
    const role = await storage.getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Remove all existing roles from the user
    const currentRoles = await storage.getUserRoles(userId);
    for (const currentRole of currentRoles) {
      console.log(`Removing role ${currentRole.name} from user ${userId}`);
      await storage.removeRoleFromUser(userId, currentRole.id);
    }

    // Assign the new role
    await storage.assignRoleToUser(userId, role.id, req.session.userId);
    console.log(`Assigned role ${roleName} to user ${userId}`);

    // Get updated roles for the user
    const updatedRoles = await storage.getUserRoles(userId);
    res.json({ roles: updatedRoles });
  } catch (error) {
    console.error('Failed to update user roles:', error);
    res.status(500).json({ error: "Failed to update user roles" });
  }
});

// Add new endpoint for updating user admin status after the existing /api/admin/members endpoint
app.patch("/api/admin/members/:id/admin-status", async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if current user is admin
    const currentUser = await storage.getUser(req.session.userId);
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const userId = parseInt(req.params.id);
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: "isAdmin must be a boolean" });
    }

    console.log(`Updating admin status for user ${userId} to ${isAdmin} by admin ${req.session.userId}`);

    // Update user's admin status
    const updatedUser = await storage.updateUserAdminStatus(userId, isAdmin);
    console.log(`Admin status for user ${userId} updated successfully. New status: ${updatedUser.isAdmin}`);

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        isVerified: updatedUser.isVerified,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error) {
    console.error('Failed to update user admin status:', error);
    res.status(500).json({ error: "Failed to update user admin status" });
  }
});

const upload = multer();

// Add these endpoints within the registerRoutes function, near the end before return createServer(app)
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const filename = await fileStorage.uploadFile(req.file);
    res.json({ url: filename });
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

app.get("/api/storage/:filename", async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const file = await fileStorage.getFile(filename);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set content-type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
        ? 'image/gif'
        : 'application/octet-stream';

    // Set headers for caching and content type
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(file);
  } catch (error) {
    console.error('Failed to get file:', error);
    res.status(500).json({ error: "Failed to get file" });
  }
});

return createServer(app);
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}