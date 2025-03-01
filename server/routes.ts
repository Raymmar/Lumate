import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { insertUserSchema, people, updatePasswordSchema, users } from "@shared/schema"; // Added import for users table
import { z } from "zod";
import { sendVerificationEmail } from './email';
import { hashPassword, comparePasswords } from './auth';
import { ZodError } from 'zod';
import { events, attendance } from '@shared/schema'; //Import events schema and attendance schema
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { eq } from 'drizzle-orm';

// Update the SSE helper functions at the top of the file
function initSSE(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send an initial message to keep the connection alive
  res.write(':\n\n');
}

function sendSSEUpdate(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Flush the response to ensure immediate delivery
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
}

// Define admin emails directly in routes since we can't import from client components
const ADMIN_EMAILS = [
  "admin@example.com",
  "me@raymmar.com"
];

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

async function syncEventAttendees(event: any) {
  try {
    const eventId = event.api_id;
    let allGuests: any[] = [];
    let hasMore = true;
    let cursor = undefined;
    let iterationCount = 0;
    const MAX_ITERATIONS = 100; // Safety limit

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
            status: guest.approval_status,
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
            console.log('Successfully stored attendance for guest:', guest.api_id);
          } catch (error) {
            console.error('Failed to store attendance for guest:', {
              guestId: guest.api_id,
              error: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        }
      }

      allGuests = allGuests.concat(response.entries);

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
  } catch (error) {
    console.error('Failed to sync event attendees:', error);
  }
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

      return res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isVerified: user.isVerified,
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

      return res.json({
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isVerified: user.isVerified,
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
  app.get("/_internal/reset-database", async (req, res) => {
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

      let cacheService = null;

      try {
        console.log('Starting database reset process');

        // Store existing attendance records
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Backing up attendance records...',
          progress: 5
        });

        console.log('Fetching existing attendance records...');
        const existingAttendance = await db
          .select()
          .from(attendance)
          .where(eq(attendance.approvalStatus, 'approved'));

        console.log(`Backed up ${existingAttendance.length} approved attendance records`);

        // Clear events table
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Clearing events table...',
          progress: 10
        });

        console.log('Clearing events table...');
        await storage.clearEvents();

        // Get existing user emails before clearing people
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Preparing to update people records...',
          progress: 15
        });

        console.log('Fetching existing user emails...');
        const existingUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(sql`person_id IS NOT NULL`);

        const userEmails = existingUsers.map(u => u.email.toLowerCase());
        console.log(`Found ${userEmails.length} user emails to preserve`);

        // Temporarily unlink users from people records
        if (userEmails.length > 0) {
          console.log('Temporarily unlinking users from people records...');
          await db
            .update(users)
            .set({ personId: null })
            .where(sql`email = ANY(${userEmails})`);
        }

        console.log('Clearing people table...');
        await storage.clearPeople();

        // Clear cache metadata
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Clearing cache metadata...',
          progress: 20
        });

        console.log('Clearing cache metadata...');
        await db.execute(sql`TRUNCATE TABLE cache_metadata RESTART IDENTITY`);

        // Initialize sync
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Fetching fresh data from Luma API',
          progress: 25
        });

        console.log('Initializing cache service...');
        // Import CacheService
        const { CacheService } = await import('./services/CacheService');
        cacheService = CacheService.getInstance();

        if (!cacheService) {
          throw new Error('Failed to initialize CacheService');
        }

        // Set up event listeners for cache service
        cacheService.on('fetchProgress', (data) => {
          console.log('Cache service progress:', data);
          sendSSEUpdate(res, {
            type: 'progress',
            ...data
          });
        });

        // Initialize a new sync
        console.log('Setting last cache update to oldest possible date...');
        const oldestPossibleDate = new Date(0);
        await storage.setLastCacheUpdate(oldestPossibleDate);

        // Start the cache update
        console.log('Starting cache update...');
        await cacheService.updateCache();
        console.log('Cache update completed');

        // Relink users with their people records
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Relinking user accounts with people records...',
          progress: 85
        });

        console.log('Relinking user accounts...');
        for (const email of userEmails) {
          try {
            const person = await storage.getPersonByEmail(email);
            if (person) {
              await db
                .update(users)
                .set({ personId: person.id })
                .where(eq(users.email, email));
              console.log(`Relinked user ${email} with person ${person.id}`);
            }
          } catch (error) {
            console.error(`Failed to relink user ${email}:`, error);
          }
        }

        // Restore attendance records
        sendSSEUpdate(res, {
          type: 'status',
          message: 'Restoring attendance records...',
          progress: 90
        });

        console.log('Restoring attendance records...');
        for (const record of existingAttendance) {
          try {
            const person = await storage.getPersonByEmail(record.userEmail);
            const event = await storage.getEventByApiId(record.eventApiId);

            if (person && event) {
              await storage.upsertAttendance({
                guestApiId: record.guestApiId,
                eventApiId: record.eventApiId,
                userEmail: record.userEmail,
                registeredAt: record.registeredAt,
                approvalStatus: record.approvalStatus
              });
              console.log(`Restored attendance record for ${record.userEmail} in event ${record.eventApiId}`);
            }
          } catch (error) {
            console.error('Failed to restore attendance record:', error);
          }
        }

        // Verify data was fetched
        console.log('Verifying data fetch...');
        const [eventCount, peopleCount] = await Promise.all([
          storage.getEventCount(),
          storage.getPeopleCount()
        ]);

        if (eventCount === 0 && peopleCount === 0) {
          throw new Error('No data was fetched from Luma API');
        }

        // Send final success message
        console.log('Sync completed successfully');
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
        sendSSEUpdate(res, {
          type: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
        res.end();
      } finally {
        if (cacheService) {
          cacheService.removeAllListeners('fetchProgress');
        }
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

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Fetch stats
      const [eventCount, peopleCount, userCount] = await Promise.all([
        storage.getEventCount(),
        storage.getPeopleCount(),
        storage.getUserCount()
      ]);

      res.json({
        events: eventCount,
        people: peopleCount,
        users: userCount,
        paidUsers: 0 // Placeholder for now
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

  // Add these routes inside registerRoutes function after existing routes
  app.get("/api/admin/events", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated"});
      }

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get events sorted by startTime in descending order
      const eventsList = await db
        .select()
        .from(events)
        .orderBy(sql`start_time DESC`);

      res.json(eventsList.map(event => ({
        ...event,
        isSynced: !!event.lastAttendanceSync,
        lastSyncedAt: event.lastAttendanceSync
      })));
    } catch (error) {
      console.error('Failed to fetch admin events:', error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });


  app.get("/api/admin/members", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get all users
      const result = await db
        .select()
        .from(users)
        .orderBy(users.email);

      res.json(result);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.get("/api/admin/people", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const result = await db
        .select()
        .from(people)
        .orderBy(people.id);

      res.json(result);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      res.status(500).json({ error: "Failed to fetch people" });
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
      if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
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

  setInterval(async () => {
    try {
      const recentlyEndedEvents = await storage.getRecentlyEndedEvents();

      console.log(`Found ${recentlyEndedEvents.length} recently ended events to sync`);

      for (const event of recentlyEndedEvents) {
        await syncEventAttendees(event);
      }
    } catch (error) {
      console.error('Failed to sync recently ended events:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log('Started event sync scheduler');
  return createServer(app);
}

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}