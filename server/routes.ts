import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { sendPasswordResetEmail } from "./email";
import { generateResetToken, hashPassword } from "./auth";
import uploadRouter from "./routes/upload";
import unsplashRouter from "./routes/unsplash";
import {
  insertUserSchema,
  people,
  updatePasswordSchema,
  users,
  roles as rolesTable,
  permissions as permissionsTable,
  rolePermissions as rolePermissionsTable,
  updateUserProfileSchema,
  attendance,
  badges,
  userBadges as userBadgesTable,
  posts,
  tags,
  postTags,
  events,
  insertPostSchema,
} from "@shared/schema";
import { z } from "zod";
import { sendVerificationEmail } from "./email";
import { comparePasswords } from "./auth";
import { ZodError } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and } from "drizzle-orm";
import { CacheService } from "./services/CacheService";
import stripeRouter from "./routes/stripe";
import { StripeService } from "./services/stripe";
import { badgeService } from "./services/BadgeService";

// Add session type declaration
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

interface Post {
  id: number;
  title: string;
  summary: string | null;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

function initSSE(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
}

function sendSSEUpdate(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const LUMA_API_BASE = "https://api.lu.ma/public/v1";

export async function lumaApiRequest(
  endpoint: string,
  params?: Record<string, string>,
  options: { method?: string; body?: string } = {},
) {
  const url = new URL(`${LUMA_API_BASE}/${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  if (!process.env.LUMA_API_KEY) {
    throw new Error("LUMA_API_KEY environment variable is not set");
  }

  console.log(`Making ${options.method || "GET"} request to Luma API:`, {
    endpoint,
    params,
    method: options.method || "GET",
    hasBody: !!options.body,
  });

  const maxRetries = 3;
  let retryCount = 0;
  let retryDelay = 1000; // Start with 1 second delay

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-luma-api-key": process.env.LUMA_API_KEY,
        },
        ...(options.body ? { body: options.body } : {}),
      });

      if (response.status === 429) {
        retryCount++;
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;

        console.log(
          `Rate limited, waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`,
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retryDelay *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Luma API error for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
          params,
        });
        throw new Error(
          `Luma API error: ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();

      console.log(`Luma API response for ${endpoint}:`, {
        status: response.status,
        hasData: !!data,
        hasEntries: data?.entries?.length > 0,
        entriesCount: data?.entries?.length,
        hasMore: data?.has_more,
        nextCursor: data?.next_cursor,
      });

      return data;
    } catch (error) {
      if (retryCount === maxRetries - 1) {
        console.error(
          `Luma API request failed for ${endpoint} after ${maxRetries} retries:`,
          error,
        );
        throw error;
      }
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retryDelay *= 2; // Exponential backoff
    }
  }
}

// Register and configure express routes
export async function registerRoutes(app: Express) {
  // Initialize route handlers and middleware
  console.log("Registering routes...");

  console.log("Initializing CacheService...");
  const cacheService = CacheService.getInstance();
  console.log("CacheService initialized.");

  const PostgresStore = connectPg(session);
  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    session({
      store: new PostgresStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
        },
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      name: "sid",
      proxy: isProduction,
    }),
  );

  app.use("/api/upload", uploadRouter);
  app.use("/api/unsplash", unsplashRouter);
  app.use("/api/stripe", stripeRouter);

  app.post("/api/register", async (req, res) => {
    try {
      const userData = await insertUserSchema.parseAsync(req.body);
      const hashedPassword = await hashPassword(userData.password);

      // Create the user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Start a session for the new user
      req.session.userId = user.id;

      // Process badges for the new user
      try {
        await badgeService.processUserBadges(user);
        console.log(`Processed badges for new user ${user.email}`);
      } catch (badgeError) {
        // Log but don't fail registration if badge processing fails
        console.error("Failed to process badges for new user:", {
          userId: user.id,
          email: user.email,
          error: badgeError,
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post(
    "/api/admin/auto-assign-badges",
    async (_req: Request, res: Response) => {
      try {
        console.log("Starting automatic badge assignment process");
        await badgeService.runDailyBadgeAssignment();
        return res.json({ message: "Automatic badge assignment completed" });
      } catch (error) {
        console.error("Failed to auto-assign badges:", error);
        return res.status(500).json({ error: "Failed to auto-assign badges" });
      }
    },
  );

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post[0]) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if the post is members-only and user is not authenticated
      if (post[0].membersOnly && !req.session.userId) {
        return res.status(403).json({
          error: "Members only content",
          membersOnly: true,
        });
      }

      // Get creator info
      const creator = await storage.getUser(post[0].creatorId);

      // Get tags for the post
      const postTagsResult = await db
        .select({
          text: tags.text,
        })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, post[0].id));

      return res.json({
        ...post[0],
        creator: creator
          ? {
              id: creator.id,
              displayName: creator.displayName,
            }
          : null,
        tags: postTagsResult.map((tag) => tag.text),
      });
    } catch (error) {
      console.error("Failed to fetch post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get("/api/public/posts", async (_req, res) => {
    try {
      console.log("Fetching public posts...");

      // Fetch all posts from database
      console.log("Fetching all posts from database...");
      const allPosts = await db
        .select({
          id: posts.id,
          title: posts.title,
          summary: posts.summary,
          body: posts.body,
          isPinned: posts.isPinned,
          membersOnly: posts.membersOnly,
          featuredImage: posts.featuredImage,
          videoUrl: posts.videoUrl,
          ctaLink: posts.ctaLink,
          ctaLabel: posts.ctaLabel,
          creatorId: posts.creatorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .orderBy(sql`created_at DESC`);

      // Fetch creators for all posts
      const postsWithCreators = await Promise.all(
        allPosts.map(async (post) => {
          const creator = await storage.getUser(post.creatorId);

          // Fetch tags for the post
          const postTagsResult = await db
            .select({
              text: tags.text,
            })
            .from(postTags)
            .innerJoin(tags, eq(tags.id, postTags.tagId))
            .where(eq(postTags.postId, post.id));

          return {
            ...post,
            creator: creator
              ? {
                  id: creator.id,
                  displayName: creator.displayName,
                }
              : null,
            tags: postTagsResult.map((tag) => tag.text),
          };
        }),
      );

      console.log("Posts with creators and tags:", postsWithCreators);

      res.json({ posts: postsWithCreators });
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/subscription/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.subscriptionId) {
        return res.json({ status: "inactive" });
      }

      return res.json({ status: user.subscriptionStatus });
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  app.get("/api/events", async (_req, res) => {
    try {
      console.log("Fetching events from storage...");
      const events = await storage.getEvents();
      console.log(`Retrieved ${events.length} events from storage`);

      res.json({
        events,
        total: events.length,
      });
    } catch (error) {
      console.error("Failed to fetch events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events/rsvp", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { event_api_id } = req.body;
      if (!event_api_id) {
        return res.status(400).json({ error: "Missing event_api_id" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.personId) {
        return res.status(401).json({ error: "User not found" });
      }

      const person = await storage.getPerson(user.personId);
      if (!person) {
        return res.status(401).json({ error: "Associated person not found" });
      }

      const response = await lumaApiRequest("event/add-guests", undefined, {
        method: "POST",
        body: JSON.stringify({
          guests: [{ email: user.email }],
          event_api_id,
        }),
      });

      await storage.upsertRsvpStatus({
        userApiId: person.api_id,
        eventApiId: event_api_id,
        status: "approved",
      });

      console.log("Successfully RSVP'd to event:", {
        eventId: event_api_id,
        userEmail: user.email,
      });

      res.json({ message: "Successfully RSVP'd to event" });
    } catch (error) {
      console.error("Failed to RSVP to event:", error);
      res.status(500).json({
        error: "Failed to RSVP to event",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/people/by-username/:username", async (req, res) => {
    try {
      const username = decodeURIComponent(req.params.username);
      console.log('Looking up person by username:', {
        originalUsername: username,
        decodedUsername: username
      });

      // First try exact match
      let person = await db
        .select()
        .from(people)
        .where(sql`LOWER(user_name) = ${username.toLowerCase()}`)
        .limit(1);

      // If no exact match, try normalized version (remove accents)
      if (!person[0]) {
        const normalizedUsername = username
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        console.log('Trying normalized username lookup:', {
          normalizedUsername,
          originalUsername: username
        });

        person = await db
          .select()
          .from(people)
          .where(sql`LOWER(UNACCENT(user_name)) = ${normalizedUsername}`)
          .limit(1);
      }

      if (!person[0]) {
        console.log('Person not found for username:', {
          username,
          normalized: username.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        });
        return res.status(404).json({ error: "Person not found" });
      }

      // Get associated user data if it exists
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.personId, person[0].id))
        .limit(1);

      if (userData[0]) {
        // Get badges for the user
        const userBadges = await db
          .select({
            id: badges.id,
            name: badges.name,
            description: badges.description,
            icon: badges.icon,
            isAutomatic: badges.isAutomatic,
          })
          .from(userBadgesTable)
          .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
          .where(eq(userBadgesTable.userId, userData[0].id));

        person[0].user = {
          ...userData[0],
          badges: userBadges
        };
      }

      res.json(person[0]);
    } catch (error) {
      console.error('Error looking up person by username:', error);
      res.status(500).json({ error: "Failed to fetch person details" });
    }
  });

  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();
      const sort = req.query.sort as string;
      const verifiedOnly = req.query.verifiedOnly === 'true';

      console.log(
        "Fetching people from storage with search:",
        searchQuery,
        "sort:",
        sort,
        "verifiedOnly:",
        verifiedOnly
      );

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

      const countMap = new Map(
        attendanceCounts.rows.map((row: any) => [row.email.toLowerCase(), row]),
      );

      let query = db
        .select({
          id: people.id,
          api_id: people.api_id,
          email: people.email,
          userName: people.userName,
          fullName: people.fullName, 
          avatarUrl: people.avatarUrl,
          role: people.role,
          phoneNumber: people.phoneNumber,
          bio: people.bio,
          organizationName: people.organizationName,
          jobTitle: people.jobTitle
        })
        .from(people);

      // Add join with users table if verifiedOnly is true
      if (verifiedOnly) {
        query = query
          .innerJoin(users, eq(users.personId, people.id))
          .where(eq(users.isVerified, true));
      }

      // Add search filter if provided
      if (searchQuery) {
        if (verifiedOnly) {
          // For verified users, add search conditions to the existing where clause
          query = query.where(
            sql`(LOWER(people.user_name) LIKE ${`%${searchQuery}%`} OR LOWER(people.email) LIKE ${`%${searchQuery}%`})`
          );
        } else {
          // For all users (when verified flag is not set)
          query = query.where(
            sql`(LOWER(user_name) LIKE ${`%${searchQuery}%`} OR LOWER(email) LIKE ${`%${searchQuery}%`})`
          );
        }
      }

      const allPeople = await query.orderBy(people.id);

      if (sort === "events") {
        const sortedPeople = allPeople.sort((a, b) => {
          const aCount = countMap.get(a.email.toLowerCase())?.event_count || 0;
          const bCount = countMap.get(b.email.toLowerCase())?.event_count || 0;

          if (bCount !== aCount) {
            return bCount - aCount;
          }

          const aDate =
            countMap.get(a.email.toLowerCase())?.last_attended || "1970-01-01";
          const bDate =
            countMap.get(b.email.toLowerCase())?.last_attended || "1970-01-01";
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedPeople = sortedPeople.slice(start, end);

        console.log(
          `Returning sorted verified people from index ${start} to ${end - 1}, total: ${sortedPeople.length}`
        );

        res.json({
          people: paginatedPeople,
          total: sortedPeople.length,
        });
        return;
      }

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = allPeople.slice(start, end);

      console.log(
        `Returning paginated verified people, total: ${allPeople.length}`
      );

      res.json({
        people: paginatedPeople,
        total: allPeople.length,
      });
    } catch (error) {
      console.error("Failed to fetch people:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Badge management endpoints
  // Password reset routes
  app.post("/api/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ message: "If an account exists, a password reset email will be sent" });
      }

      console.log('Processing password reset request for email:', email, {
        userId: user.id,
        hasDisplayName: !!user.displayName,
        email: user.email
      });

      // Delete any existing reset tokens for this email
      await storage.deletePasswordResetTokensByEmail(email);

      // Generate and store new reset token
      const token = await generateResetToken();
      const verificationToken = await storage.createPasswordResetToken(email, token);
      
      console.log('Created password reset token:', {
        email,
        tokenId: verificationToken.id,
        expiresAt: verificationToken.expiresAt,
        userDetails: {
          id: user.id,
          hasDisplayName: !!user.displayName
        }
      });

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, token);
      if (!emailSent) {
        console.error('Failed to send password reset email to:', email, {
          userId: user.id,
          hasDisplayName: !!user.displayName
        });
        throw new Error("Failed to send password reset email");
      }

      console.log('Successfully processed password reset request for:', email);
      res.json({ message: "If an account exists, a password reset email will be sent" });
    } catch (error: any) {
      console.error("Password reset request error:", {
        error: error.message,
        code: error.code,
        response: error.response?.body,
        stack: error.stack
      });
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/password-reset/reset", async (req, res) => {
    try {
      const { token, password } = req.body;

      // Validate the new password
      try {
        await updatePasswordSchema.parseAsync({ password });
      } catch (error) {
        return res.status(400).json({ 
          error: "Invalid password",
          details: error instanceof Error ? error.message : "Password validation failed"
        });
      }

      // Validate token
      const verificationToken = await storage.validatePasswordResetToken(token);
      if (!verificationToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(verificationToken.email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Hash new password and update user
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Delete the used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/admin/badges", async (_req, res) => {
    try {
      console.log("Fetching available badges");

      const availableBadges = await db
        .select({
          id: badges.id,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          isAutomatic: badges.isAutomatic,
        })
        .from(badges)
        .orderBy(badges.name);

      console.log("Retrieved badges:", {
        count: availableBadges.length,
        badges: availableBadges.map((b) => b.name),
      });

      return res.json(availableBadges);
    } catch (error) {
      console.error("Failed to fetch available badges:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch available badges" });
    }
  });

  app.post("/api/admin/members/:id/badges/:badgeName", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const badgeName = req.params.badgeName;

      console.log("Badge assignment request:", {
        userId,
        badgeName,
        params: req.params,
      });

      // Verify the user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) {
        console.log("User not found:", userId);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Found user:", {
        userId: user[0].id,
        email: user[0].email,
      });

      // Find the badge by name
      const badge = await db
        .select()
        .from(badges)
        .where(eq(badges.name, badgeName))
        .limit(1);

      if (!badge[0]) {
        console.log("Badge not found:", badgeName);
        return res.status(404).json({ error: "Badge not found" });
      }

      console.log("Found badge:", {
        badgeId: badge[0].id,
        badgeName: badge[0].name,
      });

      // Check if the badge is already assigned
      const existingAssignment = await db
        .select()
        .from(userBadgesTable)
        .where(
          and(
            eq(userBadgesTable.userId, userId),
            eq(userBadgesTable.badgeId, badge[0].id),
          ),
        )
        .limit(1);

      if (!existingAssignment[0]) {
        console.log("Attempting to assign new badge to user:", {
          userId,
          badgeId: badge[0].id,
          assignedAt: new Date().toISOString(),
        });

        try {
          // Assign the badge
          const [insertedBadge] = await db
            .insert(userBadgesTable)
            .values({
              userId: userId,
              badgeId: badge[0].id,
              assignedAt: new Date().toISOString(),
            })
            .returning();
          console.log("Successfully inserted badge assignment:", insertedBadge);
        } catch (insertError) {
          console.error("Failed to insert badge assignment:", insertError);
          throw insertError;
        }
      } else {
        console.log("Badge already assigned");
      }

      // Get all badges for the user
      let userBadgesList;
      try {
        userBadgesList = await db
          .select({
            id: badges.id,
            name: badges.name,
            description: badges.description,
            icon: badges.icon,
            isAutomatic: badges.isAutomatic,
          })
          .from(userBadgesTable)
          .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
          .where(eq(userBadgesTable.userId, userId));

        console.log("Retrieved updated badge list:", {
          userId,
          badgeCount: userBadgesList.length,
          badges: userBadgesList.map((b) => b.name),
        });
      } catch (queryError) {
        console.error("Failed to query user badges:", queryError);
        throw queryError;
      }

      return res.json({ badges: userBadgesList });
    } catch (error) {
      console.error("Failed to assign badge:", error);
      return res.status(500).json({ error: "Failed to assign badge" });
    }
  });

  app.delete("/api/admin/members/:id/badges/:badgeName", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const badgeName = req.params.badgeName;

      // Find the badge by name
      const badge = await db
        .select()
        .from(badges)
        .where(eq(badges.name, badgeName))
        .limit(1);

      if (!badge[0]) {
        return res.status(404).json({ error: "Badge not found" });
      }

      // Remove the badge assignment
      await db
        .delete(userBadgesTable)
        .where(
          and(
            eq(userBadgesTable.userId, userId),
            eq(userBadgesTable.badgeId, badge[0].id),
          ),
        );

      // Get all remaining badges for the user
      const userBadgesList = await db
        .select({
          id: badges.id,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          isAutomatic: badges.isAutomatic,
        })
        .from(userBadgesTable)
        .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
        .where(eq(userBadgesTable.userId, userId));

      return res.json({ badges: userBadgesList });
    } catch (error) {
      console.error("Failed to remove badge:", error);
      return res.status(500).json({ error: "Failed to remove badge" });
    }
  });

  app.get("/api/admin/members", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();

      console.log("Fetching members with badges:", {
        page,
        limit,
        searchQuery,
      });

      // First get all users with search filter
      const allUsers = await db
        .select()
        .from(users)
        .where(
          searchQuery
            ? sql`(LOWER(email) LIKE ${`%${searchQuery}%`} OR LOWER(display_name) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`,
        )
        .orderBy(sql`created_at DESC`);

      console.log(`Found ${allUsers.length} users matching search criteria`);

      // For each user, fetch their badges and person profile
      interface UserBadgeResult {
        id: number;
        name: string;
        description: string | null;
        icon: string;
        isAutomatic: boolean;
        assignedAt: string;
      }

      const usersWithBadgesAndProfile = await Promise.all(
        allUsers.map(async (user) => {
          // Fetch badges for this user
          const assignedBadges = (await db
            .select({
              id: badges.id,
              name: badges.name,
              description: badges.description,
              icon: badges.icon,
              isAutomatic: badges.isAutomatic,
              assignedAt: sql<string>`${userBadgesTable}.assigned_at`,
            })
            .from(userBadgesTable)
            .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
            .where(eq(userBadgesTable.userId, user.id))) as UserBadgeResult[];

          // Fetch associated person profile
          const person = await storage.getPersonByEmail(
            user.email.toLowerCase(),
          );

          console.log("Retrieved user data:", {
            userId: user.id,
            email: user.email,
            badgeCount: assignedBadges.length,
            badges: assignedBadges.map((b) => b.name),
            hasPerson: !!person,
          });

          return {
            ...user,
            badges: assignedBadges,
            person: person || null,
          };
        }),
      );

      // Calculate pagination
      const start = (page - 1) * limit;
      const paginatedUsers = usersWithBadgesAndProfile.slice(
        start,
        start + limit,
      );

      console.log("Returning paginated users with badges and profiles:", {
        totalUsers: usersWithBadgesAndProfile.length,
        returnedUsers: paginatedUsers.length,
        page,
        limit,
      });

      res.json({
        users: paginatedUsers,
        total: usersWithBadgesAndProfile.length,
      });
    } catch (error) {
      console.error("Failed to fetch members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.patch("/api/admin/members/:id/admin-status", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isAdmin } = req.body;

      console.log("Updating admin status:", {
        userId,
        isAdmin,
      });

      const result = await db
        .update(users)
        .set({ isAdmin })
        .where(eq(users.id, userId))
        .returning();

      if (!result[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Successfully updated admin status:", {
        userId,
        isAdmin: result[0].isAdmin,
      });

      return res.json(result[0]);
    } catch (error) {
      console.error("Failed to update admin status:", error);
      return res.status(500).json({ error: "Failed to update admin status" });
    }
  });

  app.get("/api/people/:id", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      // If accessing via API ID and person has a username, redirect to username URL
      if (person.userName && req.headers.accept?.includes("text/html")) {
        const formattedUsername = person.userName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-");
        return res.redirect(
          301,
          `/people/${encodeURIComponent(formattedUsername)}`,
        );
      }

      // Fetch the associated user data if it exists
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          isAdmin: users.isAdmin,
          companyName: users.companyName,
          companyDescription: users.companyDescription,
          address: users.address,
          phoneNumber: users.phoneNumber,
          isPhonePublic: users.isPhonePublic,
          isEmailPublic: users.isEmailPublic,
          customLinks: users.customLinks,
          featuredImageUrl: users.featuredImageUrl,
          tags: users.tags,
          bio: users.bio,
        })
        .from(users)
        .where(sql`LOWER(email) = LOWER(${person.email})`)
        .limit(1);

      // Attach the user data to the person object
      const personWithUser = {
        ...person,
        user: user[0] || null,
      };

      console.log("API Response - Person with user data:", {
        personId,
        hasUser: !!user[0],
        userData: user[0]
          ? {
              id: user[0].id,
              email: user[0].email,
              companyName: user[0].companyName,
              companyDescription: user[0].companyDescription,
              hasAddress: !!user[0].address,
              hasPhone: !!user[0].phoneNumber,
              hasCustomLinks:
                Array.isArray(user[0].customLinks) &&
                user[0].customLinks.length > 0,
              hasFeaturedImage: !!user[0].featuredImageUrl,
              hasTags: Array.isArray(user[0].tags) && user[0].tags.length > 0,
              hasBio: !!user[0].bio,
            }
          : null,
      });

      res.json(personWithUser);
    } catch (error) {
      console.error("Failed to fetch person:", error);
      res.status(500).json({ error: "Failed to fetch person" });
    }
  });

  app.get("/api/people/by-username/:username", async (req, res) => {
    try {
      const username = decodeURIComponent(req.params.username);
      console.log("Looking up person by username:", {
        original: req.params.username,
        decoded: username,
      });

      let person = await storage.getPersonByUsername(username);

      if (!person) {
        // Try API ID as a fallback
        console.log("Person not found by username, trying API ID:", username);
        person = await storage.getPersonByApiId(username);

        if (!person) {
          console.log("Person not found by either username or API ID");
          return res.status(404).json({ error: "Person not found" });
        }

        if (person.userName) {
          const formattedUsername = person.userName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
          console.log("Found by API ID, has username:", formattedUsername);

          // Only redirect browser requests
          if (req.headers.accept?.includes("text/html")) {
            console.log("Browser request - redirecting to username URL");
            return res.redirect(
              301,
              `/people/${encodeURIComponent(formattedUsername)}`,
            );
          }
        }
      }

      // Fetch the associated user data if it exists
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          isAdmin: users.isAdmin,
          companyName: users.companyName,
          companyDescription: users.companyDescription,
          address: users.address,
          phoneNumber: users.phoneNumber,
          isPhonePublic: users.isPhonePublic,
          isEmailPublic: users.isEmailPublic,
          customLinks: users.customLinks,
          featuredImageUrl: users.featuredImageUrl,
          tags: users.tags,
          bio: users.bio,
        })
        .from(users)
        .where(sql`LOWER(email) = LOWER(${person.email})`)
        .limit(1);

      // If we found a user, fetch their badges
      let userWithBadges = null;
      if (user[0]) {
        // Fetch badges for this user
        const userBadgesList = await db
          .select({
            id: badges.id,
            name: badges.name,
            description: badges.description,
            icon: badges.icon,
            isAutomatic: badges.isAutomatic,
          })
          .from(userBadgesTable)
          .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
          .where(eq(userBadgesTable.userId, user[0].id));

        userWithBadges = {
          ...user[0],
          badges: userBadgesList,
        };

        console.log("Found badges for user:", {
          userId: user[0].id,
          badgeCount: userBadgesList.length,
          badges: userBadgesList.map((badge) => badge.name),
        });
      }

      // Attach the user data to the person object
      const personWithUser = {
        ...person,
        user: userWithBadges,
      };

      console.log("API Response - Person with user data:", {
        personId: person.id,
        hasUser: !!userWithBadges,
        userData: userWithBadges
          ? {
              id: userWithBadges.id,
              email: userWithBadges.email,
              companyName: userWithBadges.companyName,
              badges: userWithBadges.badges?.map((b) => b.name),
              badgeCount: userWithBadges.badges?.length,
            }
          : null,
      });

      res.json(personWithUser);
    } catch (error) {
      console.error("Failed to fetch person by username:", error);
      res.status(500).json({
        error: "Failed to fetch person",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/people/check-email", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        console.log("Check Email: Missing email parameter");
        return res.status(400).json({ error: "Email is required" });
      }

      console.log("Check Email: Starting verification process for:", email);

      const person = await storage.getPersonByEmail(email.toLowerCase());
      console.log("Check Email: Person lookup result:", {
        email,
        found: !!person,
        personId: person?.api_id,
      });

      if (!person) {
        console.log("Check Email: No profile found for:", email);
        return res.json({ exists: false });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      console.log("Check Email: User account status:", {
        email,
        personId: person.api_id,
        isClaimed: !!existingUser,
      });

      return res.json({
        exists: true,
        personId: person.api_id,
        isClaimed: !!existingUser,
      });
    } catch (error) {
      console.error("Check Email: Error during verification:", error);
      res.status(500).json({ error: "Failed to check email" });
    }
  });
  
  // Email autocomplete endpoint
  app.get("/api/people/search-emails", async (req, res) => {
    try {
      console.log("Email Search API: Received request with query params:", req.query);
      const query = req.query.query as string;
      
      if (!query || typeof query !== 'string') {
        console.log("Email Search API: Invalid query parameter, returning empty results");
        return res.json({ results: [] });
      }
      
      const searchQuery = query.toLowerCase().trim();
      
      // If query is too short, return empty results to avoid heavy database queries
      if (searchQuery.length < 2) {
        console.log("Email Search API: Query too short, returning empty results");
        return res.json({ results: [] });
      }
      
      console.log("Email Search API: Searching for emails matching:", searchQuery);
      
      // Search for emails that match the query
      const results = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          email: people.email,
          userName: people.userName,
          fullName: people.fullName,
          avatarUrl: people.avatarUrl,
        })
        .from(people)
        .where(sql`LOWER(email) LIKE ${`%${searchQuery}%`}`)
        .limit(10);
        
      console.log(`Email Search API: Found ${results.length} matching emails:`, 
        results.map(p => p.email));
        
      // Check which profiles are already claimed
      const emailSet = new Set(results.map(person => person.email.toLowerCase()));
      
      if (emailSet.size > 0) {
        const claimedEmailsList = Array.from(emailSet);
        console.log("Email Search API: Checking claimed status for emails:", claimedEmailsList);
        
        // For SQL IN clause, we need to create separate parameters for each value
        const placeholders = claimedEmailsList.map(() => '?').join(',');
        const sqlQuery = sql`LOWER(email) IN (${sql.raw(placeholders)})`;
        
        const claimedEmailsQuery = await db
          .select({ email: users.email })
          .from(users)
          .where(sqlQuery, ...claimedEmailsList);
          
        const claimedEmails = new Set(claimedEmailsQuery.map(user => user.email.toLowerCase()));
        console.log("Email Search API: Found claimed emails:", Array.from(claimedEmails));
        
        // Add isClaimed flag to results
        const resultsWithClaimStatus = results.map(person => ({
          ...person,
          isClaimed: claimedEmails.has(person.email.toLowerCase())
        }));
        
        console.log("Email Search API: Sending response with results:", 
          resultsWithClaimStatus.length);
        return res.json({ results: resultsWithClaimStatus });
      }
      
      console.log("Email Search API: Sending response with unclaimed results:", results.length);
      return res.json({ results: results.map(person => ({ ...person, isClaimed: false })) });
    } catch (error) {
      console.error("Email Search: Error during search:", error);
      res.status(500).json({ error: "Failed to search emails" });
    }
  });

  app.get("/api/people/:id/stats", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      const attendanceCount = await db
        .select({ count: sql`count(*)` })
        .from(attendance)
        .where(sql`LOWER(user_email) = LOWER(${person.email})`);

      // Update the person's stats in the database
      const stats = {
        attendanceCount: Number(attendanceCount[0]?.count || 0),
        firstSeen: person.createdAt,
      };

      // Update the stats in the people table
      await db.execute(sql`
        UPDATE people 
        SET stats = jsonb_set(
          COALESCE(stats, '{}'::jsonb),
          '{totalEventsAttended}',
          ${stats.attendanceCount}::text::jsonb
        )
        WHERE id = ${person.id}
      `);

      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch person stats:", error);
      res.status(500).json({ error: "Failed to fetch person stats" });
    }
  });

  app.get("/api/people/:id/events", async (req, res) => {
    try {
      const personId = req.params.id;
      const person = await storage.getPersonByApiId(personId);

      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      const attendedEvents = await db
        .select({
          id: events.id,
          api_id: events.api_id,
          title: events.title,
          description: events.description,
          startTime: events.startTime,
          endTime: events.endTime,
          coverUrl: events.coverUrl,
          url: events.url,
        })
        .from(attendance)
        .innerJoin(events, eq(attendance.eventApiId, events.api_id))
        .where(eq(attendance.userEmail, person.email))
        .orderBy(sql`start_time DESC`);

      res.json(attendedEvents);
    } catch (error) {
      console.error("Failed to fetch attended events:", error);
      res.status(500).json({ error: "Failed to fetch attended events" });
    }
  });

  app.get("/api/auth/check-profile/:id", async (req, res) => {
    try {
      const personId = req.params.id;

      const person = await storage.getPersonByApiId(personId);
      if (!person) {
        return res.status(404).json({ error: "Person not found" });
      }

      const user = await storage.getUserByEmail(person.email.toLowerCase());

      return res.json({
        isClaimed: !!user,
        email: user ? user.email : null,
      });
    } catch (error) {
      console.error("Failed to check profile status:", error);
      res.status(500).json({ error: "Failed to check profile status" });
    }
  });

  app.post("/api/auth/claim-profile", async (req, res) => {
    try {
      console.log("Received claim profile request:", req.body);
      const { email, personId } = req.body;

      if (!email) {
        console.log("Missing required fields:", { email, personId });
        return res.status(400).json({ error: "Missing email" });
      }

      const normalizedEmail = email.toLowerCase();

      let person = null;
      if (personId) {
        person = await storage.getPersonByApiId(personId);
        console.log("Found person:", person ? "yes" : "no", { personId });
      } else {
        person = await storage.getPersonByEmail(normalizedEmail);
      }

      if (!person) {
        try {
          const events = await storage.getEvents();
          const nextEvent = events.find(
            (e) => new Date(e.startTime) > new Date(),
          );

          if (nextEvent) {
            await lumaApiRequest("event/add-guests", undefined, {
              method: "POST",
              body: JSON.stringify({
                guests: [
                  {
                    email: normalizedEmail,
                    message:
                      "Someone tried to claim your profile in our system. We couldn't find your record, but we've invited you to our next event. Once you attend, you'll be able to claim your profile!",
                  },
                ],
                event_api_id: nextEvent.api_id,
              }),
            });

            return res.json({
              status: "invited",
              message:
                "We couldn't find your profile, but we've invited you to our next event. Once you attend, you'll be able to claim your profile!",
              nextEvent: {
                title: nextEvent.title,
                startTime: nextEvent.startTime,
                url: nextEvent.url,
              },
            });
          }
        } catch (error) {
          console.error("Failed to send event invite:", error);
        }

        return res.status(404).json({
          error: "Profile not found",
          message:
            "We couldn't find your profile in our system. Please attend one of our events to create a profile.",
        });
      }

      if (personId) {
        const emailsMatch = person.email.toLowerCase() === normalizedEmail;
        console.log("Email match check:", {
          provided: normalizedEmail,
          stored: person.email.toLowerCase(),
          matches: emailsMatch,
        });

        if (!emailsMatch) {
          return res
            .status(400)
            .json({ error: "Email does not match the profile" });
        }
      }

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      console.log("Existing user check:", existingUser ? "found" : "not found");

      if (existingUser) {
        console.log(
          "Profile already claimed, no verification email will be sent",
        );
        return res.status(400).json({ error: "Profile already claimed" });
      }

      const verificationToken =
        await storage.createVerificationToken(normalizedEmail);
      console.log("Created verification token:", verificationToken.token);

      const emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationToken.token,
      );

      if (!emailSent) {
        console.log("Failed to send verification email to:", normalizedEmail);
        await storage.deleteVerificationToken(verificationToken.token);
        return res
          .status(500)
          .json({ error: "Failed to send verification email" });
      }

      console.log("Successfully sent verification email to:", normalizedEmail);

      return res.json({
        message: "Verification email sent",
        token:
          process.env.NODE_ENV === "development"
            ? verificationToken.token
            : undefined,
      });
    } catch (error) {
      console.error("Failed to claim profile:", error);
      res.status(500).json({ error: "Failed to process profile claim" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log("Fetching user data with badges:", { userId });

      const user = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          isAdmin: users.isAdmin,
          // Add other user fields as needed
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) {
        console.log("User not found:", userId);
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch user's badges
      const userBadgesList = await db
        .select({
          id: badges.id,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          isAutomatic: badges.isAutomatic,
        })
        .from(userBadgesTable)
        .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
        .where(eq(userBadgesTable.userId, userId));

      console.log("Retrieved user badges:", {
        userId,
        badgeCount: userBadgesList.length,
        badges: userBadgesList.map((b) => b.name),
      });

      return res.json({
        ...user[0],
        badges: userBadgesList,
      });
    } catch (error) {
      console.error("Failed to fetch user with badges:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        console.log("Verification attempt failed: Missing token");
        return res.status(400).json({ error: "Missing verification token" });
      }

      const verificationToken = await storage.validateVerificationToken(token);
      if (!verificationToken) {
        console.log("Verification attempt failed: Invalid or expired token");
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      console.log(
        "Valid verification token found for email:",
        verificationToken.email,
      );

      const person = await storage.getPersonByEmail(verificationToken.email);
      if (!person) {
        console.log(
          "Verification failed: Associated person not found for email:",
          verificationToken.email,
        );
        return res.status(404).json({ error: "Associated person not found" });
      }

      const userData = {
        email: verificationToken.email.toLowerCase(),
        personId: person.id,
        displayName: person.userName || person.fullName || undefined,
        isVerified: false,
      };

      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        console.log(
          "Creating new user account for verified email:",
          userData.email,
        );
        user = await storage.createUser(userData);
      }

      console.log("Email verification successful for:", userData.email);

      return res.json({
        message: "Email verified. Please set your password.",
        requiresPassword: true,
        email: verificationToken.email,
      });
    } catch (error) {
      console.error("Failed to verify token:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        console.log("Password set attempt failed: Missing email or password");
        return res.status(400).json({ error: "Missing email or password" });
      }

      const validatedPassword = updatePasswordSchema.parse({ password });

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        console.log("Password set failed: User not found for email:", email);
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await hashPassword(validatedPassword.password);

      const updatedUser = await storage.updateUserPassword(
        user.id,
        hashedPassword,
      );
      console.log("Password set successfully for user:", email);

      const verifiedUser = await storage.verifyUser(updatedUser.id);
      console.log("User account verified:", email);

      await storage.deleteVerificationTokensByEmail(email.toLowerCase());
      console.log("Cleaned up verification tokens for:", email);

      return res.json({
        message: "Password set successfully",
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
          isVerified: verifiedUser.isVerified,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        console.log("Password validation failed:", error.errors);
        return res.status(400).json({
          error: "Invalid password",
          details: error.errors,
        });
      }
      console.error("Failed to set password:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

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
        isAdmin: user.isAdmin,
        personId: user.personId,
        api_id,
        // Add all profile fields
        bio: user.bio,
        featuredImageUrl: user.featuredImageUrl,
        companyName: user.companyName,
        companyDescription: user.companyDescription,
        address: user.address,
        phoneNumber: user.phoneNumber,
        isPhonePublic: user.isPhonePublic,
        isEmailPublic: user.isEmailPublic,
        ctaText: user.ctaText,
        customLinks: user.customLinks || [],
        tags: user.tags || [],
      });
    } catch (error) {
      console.error("Failed to get user info:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

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
          isAdmin: user.isAdmin,
          personId: user.personId,
        },
      });
    } catch (error) {
      console.error("Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Logout failed:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("Post update rejected: User not authenticated");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        console.log("Post update rejected: Invalid post ID:", req.params.id);
        return res.status(400).json({ error: "Invalid post ID" });
      }

      console.log("Processing post update request:", {
        postId,
        userId: req.session.userId,
        updateData: req.body,
      });

      // Get the existing post
      const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post || post.length === 0) {
        console.log("Post update rejected: Post not found:", postId);
        return res.status(404).json({ error: "Post not found" });
      }

      const existingPost = post[0];
      console.log("Found existing post:", {
        id: existingPost.id,
        title: existingPost.title,
        creatorId: existingPost.creatorId,
      });

      // Check if user has permission to edit this post
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log(
          "Post update rejected: User not found:",
          req.session.userId,
        );
        return res.status(401).json({ error: "User not found" });
      }

      if (!user.isAdmin && existingPost.creatorId !== user.id) {
        console.log("Post update rejected: Unauthorized edit attempt", {
          userId: user.id,
          postCreatorId: existingPost.creatorId,
          isAdmin: user.isAdmin,
        });
        return res
          .status(403)
          .json({ error: "Not authorized to edit this post" });
      }

      // Validate the update data
      const updateData = insertPostSchema.partial().parse(req.body);
      console.log("Validated update data:", updateData);

      // Update the post
      const updatedPost = await storage.updatePost(postId, updateData);
      console.log("Post updated successfully:", {
        id: updatedPost.id,
        title: updatedPost.title,
        updatedAt: updatedPost.updatedAt,
      });

      // Update post tags if provided
      if (req.body.tags) {
        console.log("Updating post tags:", req.body.tags);

        // Delete existing tags
        await db.delete(postTags).where(eq(postTags.postId, postId));
        console.log("Deleted existing tags for post:", postId);

        // Insert new tags
        for (const tagText of req.body.tags) {
          // Find or create tag
          let [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.text, tagText.toLowerCase()));

          if (!tag) {
            [tag] = await db
              .insert(tags)
              .values({ text: tagText.toLowerCase() })
              .returning();
            console.log("Created new tag:", tag.text);
          }

          // Link tag to post
          await db
            .insert(postTags)
            .values({ postId, tagId: tag.id })
            .onConflictDoNothing();
        }
        console.log("Updated post tags successfully");
      }

      res.json(updatedPost);
    } catch (error) {
      console.error("Failed to update post:", error);
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid post data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("Post deletion rejected: User not authenticated");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        console.log("Post deletion rejected: Invalid post ID:", req.params.id);
        return res.status(400).json({ error: "Invalid post ID" });
      }

      // Get the existing post
      const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post || post.length === 0) {
        console.log("Post deletion rejected: Post not found:", postId);
        return res.status(404).json({ error: "Post not found" });
      }

      const existingPost = post[0];

      // Check if user has permission to delete this post
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log(
          "Post deletion rejected: User not found:",
          req.session.userId,
        );
        return res.status(401).json({ error: "User not found" });
      }

      if (!user.isAdmin && existingPost.creatorId !== user.id) {
        console.log("Post deletion rejected: Unauthorized deletion attempt", {
          userId: user.id,
          postCreatorId: existingPost.creatorId,
          isAdmin: user.isAdmin,
        });
        return res
          .status(403)
          .json({ error: "Not authorized to delete this post" });
      }

      // Delete associated tags first
      await db.delete(postTags).where(eq(postTags.postId, postId));
      console.log("Deleted associated tags for post:", postId);

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));
      console.log("Successfully deleted post:", postId);

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Failed to delete post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  app.post("/_internal/reset-database", async (req, res) => {
    try {
      const requestIP = req.ip || req.socket.remoteAddress;
      const isLocalRequest =
        requestIP === "127.0.0.1" ||
        requestIP === "::1" ||
        requestIP === "localhost";
      const isDevelopment = process.env.NODE_ENV === "development";

      if (!isLocalRequest && !isDevelopment) {
        console.warn(`Unauthorized database reset attempt from ${requestIP}`);
        return res
          .status(403)
          .json({
            error:
              "Forbidden. This endpoint is restricted to internal use only.",
          });
      }

      initSSE(res);
      sendSSEUpdate(res, {
        type: "status",
        message: "Starting database reset process",
        progress: 0,
      });

      try {
        sendSSEUpdate(res, {
          type: "status",
          message: "Clearing events table...",
          progress: 5,
        });

        // Modify foreign key constraints and clear tables
        await db.execute(sql`
          -- Temporarily modify foreign key constraints
          ALTER TABLE users 
          DROP CONSTRAINT users_person_id_fkey,
          ADD CONSTRAINT users_person_id_fkey 
          FOREIGN KEY (person_id) REFERENCES people(id) 
          ON DELETE SET NULL;

          ALTER TABLE attendance 
          DROP CONSTRAINT attendance_person_id_fkey,
          ADD CONSTRAINT attendance_person_id_fkey 
          FOREIGN KEY (person_id) REFERENCES people(id) 
          ON DELETE SET NULL;

          -- Clear tables while preserving relationships
          TRUNCATE TABLE events RESTART IDENTITY CASCADE;
          UPDATE users SET person_id = NULL;
          UPDATE attendance SET person_id = NULL;
          DELETE FROM people;
          ALTER SEQUENCE people_id_seq RESTART WITH 1;
        `);

        sendSSEUpdate(res, {
          type: "status",
          message: "Initializing fresh data fetch from Luma API",
          progress: 20,
        });

        const cacheService = CacheService.getInstance();

        // Set up SSE event handlers
        const progressHandler = (data: any) => {
          sendSSEUpdate(res, {
            type: data.type,
            message: data.message,
            progress: data.progress,
            data: data.data,
          });

          // If we receive a complete event, clean up and end the connection
          if (data.type === "complete" || data.type === "error") {
            cacheService.removeListener("fetchProgress", progressHandler);
            res.end();
          }
        };

        // Register event handler
        cacheService.on("fetchProgress", progressHandler);

        // Start the sync process
        await cacheService.forceSync();
      } catch (error) {
        console.error("Failed during database reset:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }

        sendSSEUpdate(res, {
          type: "error",
          message: error instanceof Error ? error.message : String(error),
          progress: 0,
        });

        res.end();
      }
    } catch (error) {
      console.error("Failed to reset database:", error);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Failed to reset database",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
  app.patch("/api/auth/update-profile", async (req, res) => {
    try {
      console.log("🔵 Profile Update: Starting request processing", {
        sessionId: req.session?.id,
        userId: req.session?.userId,
        method: req.method,
        path: req.path,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });

      if (!req.session.userId) {
        console.log(
          "🔴 Profile Update: Authentication failed - No user ID in session",
        );
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("🟡 Profile Update: Processing request body", {
        userId: req.session.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        bodyKeys: Object.keys(req.body),
      });

      try {
        // Log the address field specifically
        console.log("🔍 Address field debug:", {
          rawAddress: req.body.address,
          type: typeof req.body.address,
          length: req.body.address?.length,
        });

        const validationResult = updateUserProfileSchema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("🔴 Profile Update: Validation failed", {
            userId: req.session.userId,
            errors: validationResult.error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
            receivedData: req.body,
          });

          return res.status(400).json({
            error: "Invalid profile data",
            details: validationResult.error.errors,
          });
        }

        const userData = validationResult.data;
        console.log("🟢 Profile Update: Validation successful", {
          userId: req.session.userId,
          validatedFields: Object.keys(userData),
          validatedData: JSON.stringify(userData, null, 2),
          addressField: {
            raw: userData.address,
            type: typeof userData.address,
          },
        });

        const updatedUser = await storage.updateUser(req.session.userId, {
          displayName: userData.displayName,
          bio: userData.bio ?? null,
          featuredImageUrl: userData.featuredImageUrl ?? null,
          companyName: userData.companyName ?? null,
          companyDescription: userData.companyDescription ?? null,
          address: userData.address ?? null,
          phoneNumber: userData.phoneNumber ?? null,
          isPhonePublic: userData.isPhonePublic ?? false,
          isEmailPublic: userData.isEmailPublic ?? false,
          ctaText: userData.ctaText ?? null,
          customLinks: userData.customLinks ?? [],
          tags: userData.tags ?? [],
        });

        console.log("🟢 Profile Update: Database update successful", {
          userId: updatedUser.id,
          updatedFields: Object.keys(updatedUser),
          result: JSON.stringify(updatedUser, null, 2),
        });

        return res.json(updatedUser);
      } catch (processingError) {
        console.error("🔴 Profile Update: Processing error", {
          userId: req.session.userId,
          error: {
            name: processingError.name,
            message: processingError.message,
            stack: processingError.stack,
            ...(processingError instanceof z.ZodError && {
              zodErrors: processingError.errors,
            }),
          },
          requestBody: JSON.stringify(req.body, null, 2),
        });
        throw processingError;
      }
    } catch (error) {
      console.error("🔴 Profile Update: Unhandled error", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userId: req.session?.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: "Failed to update profile",
        message: error.message,
      });
    }
  });

  app.get("/api/public/stats", async (_req, res) => {
    try {
      const [eventCount, totalAttendeesCount, uniqueAttendeesCount] =
        await Promise.all([
          storage.getEventCount(),
          storage.getTotalAttendeesCount(),
          storage.getPeopleCount(),
        ]);

      res.json({
        events: eventCount,
        totalAttendees: totalAttendeesCount,
        uniqueAttendees: uniqueAttendeesCount,
      });
    } catch (error) {
      console.error("Failed to fetch public stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const [eventCount, peopleCount, userCount, totalAttendeesCount] =
        await Promise.all([
          storage.getEventCount(),
          storage.getPeopleCount(),
          storage.getUserCount(),
          storage.getTotalAttendeesCount(),
        ]);

      res.json({
        events: eventCount,
        people: peopleCount,
        users: userCount,
        uniqueAttendees: peopleCount,
        totalAttendees: totalAttendeesCount,
        paidUsers: 0,
      });
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/events/check-rsvp", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { event_api_id } = req.query;
      if (!event_api_id) {
        return res.status(400).json({ error: "Missing event_api_id" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.personId) {
        return res.status(401).json({ error: "User not found" });
      }

      const person = await storage.getPerson(user.personId);
      if (!person) {
        return res.status(401).json({ error: "Associated person not found" });
      }

      const cachedStatus = await storage.getRsvpStatus(
        person.api_id,
        event_api_id as string,
      );
      if (cachedStatus) {
        return res.json({
          isGoing: cachedStatus.status === "approved",
          status: cachedStatus.status,
        });
      }

      const response = await lumaApiRequest("event/get-guest", {
        event_api_id: event_api_id as string,
        email: user.email,
      });

      console.log("Checked RSVP status:", {
        eventId: event_api_id,
        userEmail: user.email,
        status: response.guest?.approval_status,
        fullResponse: response,
      });

      if (response.guest?.approval_status) {
        await storage.upsertRsvpStatus({
          userApiId: person.api_id,
          eventApiId: event_api_id as string,
          status: response.guest.approval_status,
        });
      }

      res.json({
        isGoing: response.guest?.approval_status === "approved",
        status: response.guest?.approval_status,
      });
    } catch (error) {
      console.error("Failedto check RSVP status:", error);
      res.status(500).json({
        error: "Failed to check RSVP status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/events/featured", async (_req, res) => {
    try {
      const featuredEvent = await storage.getFeaturedEvent();

      if (!featuredEvent) {
        return res.status(404).json({ error: "No featured event found" });
      }

      res.json(featuredEvent);
    } catch (error) {
      console.error("Failed to fetch featured event:", error);
      res.status(500).json({ error: "Failed to fetch featured event" });
    }
  });

  app.get("/api/admin/events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();
      const offset = (page - 1) * limit;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`,
        )
        .then((result) => Number(result[0].count));

      const eventsList = await db
        .select()
        .from(events)
        .where(
          searchQuery
            ? sql`(LOWER(title) LIKE ${`%${searchQuery}%`} OR LOWER(description) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`,
        )
        .orderBy(sql`start_time DESC`)
        .limit(limit)
        .offset(offset);
      const eventsWithStatus = await Promise.all(
        eventsList.map(async (event) => {
          const attendanceStatus = await storage.getEventAttendanceStatus(
            event.api_id,
          );
          return {
            ...event,
            isSynced: attendanceStatus.hasAttendees,
            lastSyncedAt: attendanceStatus.lastSyncTime,
            lastAttendanceSync:
              event.lastAttendanceSync || attendanceStatus.lastSyncTime,
          };
        }),
      );

      res.json({
        events: eventsWithStatus,
        total: totalCount,
      });
    } catch (error) {
      console.error("Failed to fetch admin events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/admin/people", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();
      const offset = (page - 1) * limit;

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
            : sql`1=1`,
        )
        .then((result) => Number(result[0].count));

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
            : sql`1=1`,
        )
        .orderBy(people.id)
        .limit(limit)
        .offset(offset);

      res.json({
        people: peopleList,
        total: totalCount,
      });
    } catch (error) {
      console.error("Failed to fetch people:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.get("/api/admin/events/:eventId/guests", async (req, res) => {
    try {
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

      // Initialize SSE connection
      initSSE(res);

      let allGuests: any[] = [];
      let hasMore = true;
      let cursor = undefined;
      let iterationCount = 0;
      const MAX_ITERATIONS = 100;

      // Fetch event details for progress messages
      const event = await storage.getEventByApiId(eventId);
      if (!event) {
        sendSSEUpdate(res, {
          type: "error",
          message: "Event not found",
          progress: 0,
        });
        return res.end();
      }

      sendSSEUpdate(res, {
        type: "status",
        message: `Starting attendance sync for event: ${event.title}`,
        progress: 0,
      });

      try {
        sendSSEUpdate(res, {
          type: "status",
          message: "Clearing existing attendance records...",
          progress: 5,
        });

        await storage.deleteAttendanceByEvent(eventId);

        sendSSEUpdate(res, {
          type: "status",
          message: "Successfully cleared existing attendance records",
          progress: 10,
        });
      } catch (error) {
        sendSSEUpdate(res, {
          type: "error",
          message: "Failed to clear existing attendance records",
          progress: 0,
        });
        res.end();
        return;
      }

      let totalProcessed = 0;
      let successCount = 0;
      let failureCount = 0;

      while (hasMore && iterationCount < MAX_ITERATIONS) {
        const params: Record<string, string> = {
          event_api_id: eventId,
        };

        if (cursor) {
          params.pagination_cursor = cursor;
        }

        sendSSEUpdate(res, {
          type: "status",
          message: `Fetching guests batch ${iterationCount + 1}...`,
          progress: 10 + iterationCount * 2,
        });

        const response = await lumaApiRequest("event/get-guests", params);

        if (response.entries) {
          const approvedEntries = response.entries.filter(
            (entry: any) => entry.guest.approval_status === "approved",
          );

          for (const entry of approvedEntries) {
            const guest = entry.guest;
            totalProcessed++;

            try {
              await storage.upsertAttendance({
                eventApiId: eventId,
                userEmail: guest.email.toLowerCase(),
                guestApiId: guest.api_id,
                approvalStatus: guest.approval_status,
                registeredAt: guest.registered_at,
              });

              successCount++;
              sendSSEUpdate(res, {
                type: "progress",
                message: `Successfully processed ${guest.email}`,
                data: {
                  total: totalProcessed,
                  success: successCount,
                  failure: failureCount,
                },
                progress: Math.min(
                  90,
                  10 + (totalProcessed / (response.total || 1)) * 80,
                ),
              });
            } catch (error) {
              failureCount++;
              sendSSEUpdate(res, {
                type: "error",
                message: `Failed to process ${guest.email}: ${error instanceof Error ? error.message : String(error)}`,
                data: {
                  total: totalProcessed,
                  success: successCount,
                  failure: failureCount,
                },
                progress: Math.min(
                  90,
                  10 + (totalProcessed / (response.total || 1)) * 80,
                ),
              });
            }
          }

          allGuests = allGuests.concat(approvedEntries);
        }

        hasMore = response.has_more;
        cursor = response.next_cursor;
        iterationCount++;

        sendSSEUpdate(res, {
          type: "status",
          message: `Processed ${totalProcessed} guests so far...`,
          data: {
            total: totalProcessed,
            success: successCount,
            failure: failureCount,
            hasMore,
            currentBatch: iterationCount,
          },
          progress: Math.min(
            90,
            10 + (totalProcessed / (response.total || 1)) * 80,
          ),
        });
      }

      if (iterationCount >= MAX_ITERATIONS) {
        sendSSEUpdate(res, {
          type: "warning",
          message: "Reached maximum iteration limit while syncing guests",
          progress: 95,
        });
      }

      await storage.updateEventAttendanceSync(eventId);

      sendSSEUpdate(res, {
        type: "complete",
        message: "Attendance sync completed",
        data: {
          total: totalProcessed,
          success: successCount,
          failure: failureCount,
          totalGuests: allGuests.length,
        },
        progress: 100,
      });

      res.end();
    } catch (error) {
      console.error("Failed to sync event guests:", error);
      sendSSEUpdate(res, {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
        progress: 0,
      });
      res.end();
    }
  });

  app.get("/api/admin/events/:eventId/attendees", async (req, res) => {
    try {
      const eventId = req.params.eventId;

      // Get the count first
      const attendanceCount = await db
        .select({ count: sql`count(*)` })
        .from(attendance)
        .where(eq(attendance.eventApiId, eventId));

      // Get the attendees with their details
      const attendees = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          userName: people.userName,
          email: people.email,
          avatarUrl: people.avatarUrl,
        })
        .from(attendance)
        .innerJoin(people, eq(attendance.personId, people.id))
        .where(eq(attendance.eventApiId, eventId))
        .orderBy(sql`registered_at DESC`);

      res.json({
        attendees,
        total: Number(attendanceCount[0]?.count || 0),
      });
    } catch (error) {
      console.error("Failed to fetch event attendees:", error);
      res.status(500).json({ error: "Failed to fetch event attendees" });
    }
  });

  app.post("/api/events/send-invite", async (req, res) => {
    try {
      const { email, event_api_id } = req.body;

      if (!email || !event_api_id) {
        return res.status(400).json({ error: "Missing email or event_api_id" });
      }

      console.log("Sending invite for event:", {
        eventId: event_api_id,
        userEmail: email,
      });

      const response = await lumaApiRequest("event/send-invites", undefined, {
        method: "POST",
        body: JSON.stringify({
          guests: [{ email }],
          event_api_id,
        }),
      });

      console.log("Invite sent successfully:", {
        eventId: event_api_id,
        userEmail: email,
        response,
      });

      res.json({
        message: "Invite sent successfully. Please check your email.",
        details: response,
      });
    } catch (error) {
      console.error("Failed to send invite:", error);
      res.status(500).json({
        error: "Failed to send invite",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/public/posts", async (req, res) => {
    try {
      console.log("Fetching public posts...");
      const posts = await storage.getPosts();
      console.log(
        "Public posts retrieved:",
        posts.map((p) => ({
          id: p.id,
          title: p.title,
          creatorId: p.creatorId,
          creator: p.creator,
        })),
      );
      res.json({ posts });
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/tags", async (_req, res) => {
    try {
      const result = await db
        .select({
          id: tags.id,
          text: tags.text,
        })
        .from(tags)
        .orderBy(tags.text);

      res.json({ tags: result });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/admin/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const post = {
        ...req.body,
        creatorId: req.session.userId, // Ensure we're setting the creator ID from the session
      };

      console.log("Creating post with data:", {
        ...post,
        body: post.body?.substring(0, 100) + "...", // Truncate body for logging
      });

      const createdPost = await storage.createPost(post);
      console.log("Post created successfully:", {
        id: createdPost.id,
        creatorId: createdPost.creatorId,
      });

      res.json(createdPost);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.get("/api/admin/posts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get posts with their tags and creators
      const postsWithTags = await db
        .select({
          id: posts.id,
          title: posts.title,
          summary: posts.summary,
          body: posts.body,
          featuredImage: posts.featuredImage,
          videoUrl: posts.videoUrl,
          ctaLink: posts.ctaLink,
          ctaLabel: posts.ctaLabel,
          isPinned: posts.isPinned,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          creatorId: posts.creatorId,
          creator_id: users.id,
          creator_display_name: users.displayName,
          tags_text: tags.text,
        })
        .from(posts)
        .leftJoin(users, eq(posts.creatorId, users.id))
        .leftJoin(postTags, eq(posts.id, postTags.postId))
        .leftJoin(tags, eq(postTags.tagId, tags.id));

      // Group posts with their tags and creators
      const groupedPosts = postsWithTags.reduce((acc: any[], post) => {
        const existingPost = acc.find((p) => p.id === post.id);
        if (existingPost) {
          if (post.tags_text) {
            existingPost.tags = [
              ...new Set([...existingPost.tags, post.tags_text]),
            ];
          }
        } else {
          acc.push({
            ...post,
            creator: post.creator_id
              ? {
                  id: post.creator_id,
                  displayName: post.creator_display_name,
                }
              : undefined,
            tags: post.tags_text ? [post.tags_text] : [],
          });
        }
        return acc;
      }, []);

      res.json({ posts: groupedPosts });
    } catch (error) {
      console.error("Failed to fetch admin posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/admin/members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();
      const offset = (page - 1) * limit;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          searchQuery
            ? sql`(LOWER(email) LIKE ${`%${searchQuery}%`} OR LOWER(display_name) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`,
        )
        .then((result) => Number(result[0].count));

      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          person: people,
        })
        .from(users)
        .leftJoin(people, eq(users.personId, people.id))
        .where(
          searchQuery
            ? sql`(LOWER(${users.email}) LIKE ${`%${searchQuery}%`} OR LOWER(${users.displayName}) LIKE ${`%${searchQuery}%`})`
            : sql`1=1`,
        )
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset);

      res.json({
        users: usersList,
        total: totalCount,
      });
    } catch (error) {
      console.error("Failed to fetch members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/admin/users/:id/toggle-admin", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const targetUserId = parseInt(req.params.id);
      const targetUser = await storage.getUser(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(
        `Toggling admin status for user ${targetUserId} from ${targetUser.isAdmin} to ${!targetUser.isAdmin}`,
      );

      const updatedUser = await storage.updateUserAdminStatus(
        targetUserId,
        !targetUser.isAdmin,
      );

      console.log(
        `Admin status for user ${targetUserId} updated successfully. New status: ${updatedUser.isAdmin}`,
      );
      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to toggle admin status:", error);
      res.status(500).json({ error: "Failed to toggle admin status" });
    }
  });
  app.get("/api/admin/roles", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);

      console.log("Fetched roles:", roles);
      res.json(roles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/admin/permissions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const permissions = await db
        .select()
        .from(permissionsTable)
        .orderBy(permissionsTable.id);

      console.log("Fetched permissions:", permissions);
      res.json(permissions);
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.get("/api/admin/roles/:id/permissions", async (req, res) => {
    try {
      if (!req.session.userId) {
        console.log("Unauthorized access attempt - no session userId");
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        console.log("Unauthorized access attempt - not admin:", {
          userId: req.session.userId,
        });
        return res.status(403).json({ error: "Not authorized" });
      }

      const roleId = parseInt(req.params.id);
      if (isNaN(roleId)) {
        console.log("Invalid role ID:", req.params.id);
        return res.status(400).json({ error: "Invalid role ID" });
      }

      console.log("Fetching permissions for role:", roleId);

      const rolePermissions = await db
        .select({
          id: permissionsTable.id,
          name: permissionsTable.name,
          description: permissionsTable.description,
          resource: permissionsTable.resource,
          action: permissionsTable.action,
        })
        .from(rolePermissionsTable)
        .innerJoin(
          permissionsTable,
          eq(permissionsTable.id, rolePermissionsTable.permissionId),
        )
        .where(eq(rolePermissionsTable.roleId, roleId));

      console.log("Role permissions found:", {
        roleId,
        permissionsCount: rolePermissions.length,
        permissions: rolePermissions.map((p) => ({ id: p.id, name: p.name })),
      });

      res.json(rolePermissions);
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  app.post(
    "/api/admin/roles/:roleId/permissions/:permissionId",
    async (req, res) => {
      try {
        if (!req.session.userId) {
          console.log("Unauthorized access attempt - no session userId");
          return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          console.log("Unauthorized access attempt - not admin:", {
            userId: req.session.userId,
          });
          return res.status(403).json({ error: "Not authorized" });
        }

        const roleId = parseInt(req.params.roleId);
        const permissionId = parseInt(req.params.permissionId);

        if (isNaN(roleId) || isNaN(permissionId)) {
          console.log("Invalid role or permission ID:", {
            roleId: req.params.roleId,
            permissionId: req.params.permissionId,
          });
          return res
            .status(400)
            .json({ error: "Invalid role or permission ID" });
        }

        const [role, permission] = await Promise.all([
          db
            .select()
            .from(rolesTable)
            .where(eq(rolesTable.id, roleId))
            .limit(1),
          db
            .select()
            .from(permissionsTable)
            .where(eq(permissionsTable.id, permissionId))
            .limit(1),
        ]);

        if (!role[0] || !permission[0]) {
          console.log("Role or permission not found:", {
            roleId,
            permissionId,
          });
          return res
            .status(404)
            .json({ error: "Role or permission not found" });
        }

        console.log("Adding permission to role:", {
          roleId,
          roleName: role[0].name,
          permissionId,
          permissionName: permission[0].name,
        });

        const existing = await db
          .select()
          .from(rolePermissionsTable)
          .where(
            and(
              eq(rolePermissionsTable.roleId, roleId),
              eq(rolePermissionsTable.permissionId, permissionId),
            ),
          );

        if (existing.length > 0) {
          console.log("Permission already exists for role:", {
            roleId,
            permissionId,
          });
          return res
            .status(409)
            .json({ error: "Permission already assigned to role" });
        }

        await db.insert(rolePermissionsTable).values({
          roleId,
          permissionId,
          grantedBy: req.session.userId,
          grantedAt: new Date().toISOString(),
        });

        console.log("Successfully added permission to role");

        const updatedPermissions = await db
          .select({
            id: permissionsTable.id,
            name: permissionsTable.name,
            description: permissionsTable.description,
            resource: permissionsTable.resource,
            action: permissionsTable.action,
          })
          .from(rolePermissionsTable)
          .innerJoin(
            permissionsTable,
            eq(permissionsTable.id, rolePermissionsTable.permissionId),
          )
          .where(eq(rolePermissionsTable.roleId, roleId));

        console.log("Updated permissions:", {
          roleId,
          roleName: role[0].name,
          permissionsCount: updatedPermissions.length,
          permissions: updatedPermissions.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        });

        res.json(updatedPermissions);
      } catch (error) {
        console.error("Failed to assign permission to role:", error);
        res.status(500).json({ error: "Failed to assign permission to role" });
      }
    },
  );

  app.delete(
    "/api/admin/roles/:roleId/permissions/:permissionId",
    async (req, res) => {
      try {
        if (!req.session.userId) {
          console.log("Unauthorized access attempt - no session userId");
          return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await storage.getUser(req.session.userId);
        if (!user?.isAdmin) {
          console.log("Unauthorized access attempt - not admin:", {
            userId: req.session.userId,
          });
          return res.status(403).json({ error: "Not authorized" });
        }

        const roleId = parseInt(req.params.roleId);
        const permissionId = parseInt(req.params.permissionId);

        if (isNaN(roleId) || isNaN(permissionId)) {
          console.log("Invalid role or permission ID:", {
            roleId: req.params.roleId,
            permissionId: req.params.permissionId,
          });
          return res
            .status(400)
            .json({ error: "Invalid role or permission ID" });
        }

        const [role, permission] = await Promise.all([
          db
            .select()
            .from(rolesTable)
            .where(eq(rolesTable.id, roleId))
            .limit(1),
          db
            .select()
            .from(permissionsTable)
            .where(eq(permissionsTable.id, permissionId))
            .limit(1),
        ]);

        if (!role[0] || !permission[0]) {
          console.log("Role or permission not found:", {
            roleId,
            permissionId,
          });
          return res
            .status(404)
            .json({ error: "Role or permission not found" });
        }

        console.log("Removing permission from role:", {
          roleId,
          roleName: role[0].name,
          permissionId,
          permissionName: permission[0].name,
        });

        const result = await db
          .delete(rolePermissionsTable)
          .where(
            and(
              eq(rolePermissionsTable.roleId, roleId),
              eq(rolePermissionsTable.permissionId, permissionId),
            ),
          )
          .returning();

        console.log("Delete operation result:", result);

        const updatedPermissions = await db
          .select({
            id: permissionsTable.id,
            name: permissionsTable.name,
            description: permissionsTable.description,
            resource: permissionsTable.resource,
            action: permissionsTable.action,
          })
          .from(rolePermissionsTable)
          .innerJoin(
            permissionsTable,
            eq(permissionsTable.id, rolePermissionsTable.permissionId),
          )
          .where(eq(rolePermissionsTable.roleId, roleId));

        console.log("Updated permissions after removal:", {
          roleId,
          roleName: role[0].name,
          permissionsCount: updatedPermissions.length,
          permissions: updatedPermissions.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        });

        res.json(updatedPermissions);
      } catch (error) {
        console.error("Failed to remove permission from role:", error);
        res
          .status(500)
          .json({ error: "Failed to remove permission from role" });
      }
    },
  );

  app.post("/api/admin/members/:userId/roles/:roleName", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const adminUser = await storage.getUser(req.session.userId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const userId = parseInt(req.params.userId);
      const roleName = req.params.roleName;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      console.log(
        `Updating roles for user ${userId} to role ${roleName} by admin ${req.session.userId}`,
      );

      const role = await storage.getRoleByName(roleName);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }

      const currentRoles = await storage.getUserRoles(userId);
      for (const currentRole of currentRoles) {
        console.log(`Removing role ${currentRole.name} from user ${userId}`);
        await storage.removeRoleFromUser(userId, currentRole.id);
      }

      await storage.assignRoleToUser(userId, role.id, req.session.userId);
      console.log(`Assigned role ${roleName} to user ${userId}`);

      const updatedRoles = await storage.getUserRoles(userId);
      res.json({ roles: updatedRoles });
    } catch (error) {
      console.error("Failed to update user roles:", error);
      res.status(500).json({ error: "Failed to update user roles" });
    }
  });

  app.patch("/api/auth/update-profile", async (req, res) => {
    try {
      console.log("🔵 Profile Update: Starting request processing", {
        sessionId: req.session?.id,
        userId: req.session?.userId,
        method: req.method,
        path: req.path,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });

      if (!req.session.userId) {
        console.log(
          "🔴 Profile Update: Authentication failed - No user ID in session",
        );
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("🟡 Profile Update: Processing request body", {
        userId: req.session.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        bodyKeys: Object.keys(req.body),
      });

      try {
        // Attempt to validate the incoming data
        const validationResult = updateUserProfileSchema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("🔴 Profile Update: Validation failed", {
            userId: req.session.userId,
            errors: validationResult.error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
            receivedData: req.body,
          });

          return res.status(400).json({
            error: "Invalid profile data",
            details: validationResult.error.errors,
          });
        }

        const userData = validationResult.data;
        console.log("🟢 Profile Update: Validation successful", {
          userId: req.session.userId,
          validatedFields: Object.keys(userData),
          validatedData: JSON.stringify(userData, null, 2),
        });

        // Attempt to update the user
        const updatedUser = await storage.updateUser(req.session.userId, {
          displayName: userData.displayName,
          bio: userData.bio ?? null,
          featuredImageUrl: userData.featuredImageUrl ?? null,
          companyName: userData.companyName ?? null,
          companyDescription: userData.companyDescription ?? null,
          address: userData.address ?? null,
          phoneNumber: userData.phoneNumber ?? null,
          isPhonePublic: userData.isPhonePublic ?? false,
          isEmailPublic: userData.isEmailPublic ?? false,
          ctaText: userData.ctaText ?? null,
          customLinks: userData.customLinks ?? [],
          tags: userData.tags ?? [],
        });

        console.log("🟢 Profile Update: Database update successful", {
          userId: updatedUser.id,
          updatedFields: Object.keys(updatedUser),
          result: JSON.stringify(updatedUser, null, 2),
        });

        return res.json(updatedUser);
      } catch (processingError) {
        console.error("🔴 Profile Update: Processing error", {
          userId: req.session.userId,
          error: {
            name: processingError.name,
            message: processingError.message,
            stack: processingError.stack,
            ...(processingError instanceof z.ZodError && {
              zodErrors: processingError.errors,
            }),
          },
          requestBody: JSON.stringify(req.body, null, 2),
        });
        throw processingError;
      }
    } catch (error) {
      console.error("🔴 Profile Update: Unhandled error", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userId: req.session?.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: "Failed to update profile",
        message: error.message,
      });
    }
  });

  app.get("/api/admin/events/:id/sync-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.id;

      // Set up SSE connection
      initSSE(res);

      // Send initial status
      sendSSEUpdate(res, {
        type: "status",
        message: "Starting attendance sync...",
        progress: 0,
      });

      try {
        const event = await storage.getEventByApiId(eventId);
        if (!event) {
          sendSSEUpdate(res, {
            type: "error",
            message: "Event not found",
            progress: 0,
          });
          return res.end();
        }

        // Clear existing attendance records
        sendSSEUpdate(res, {
          type: "status",
          message: "Clearing existing attendance records...",
          progress: 10,
        });

        await storage.deleteAttendanceByEvent(eventId);

        // Fetch guests from Luma API
        sendSSEUpdate(res, {
          type: "status",
          message: "Fetching guest list from event platform...",
          progress: 20,
        });

        let cursor = null;
        let totalGuests = 0;
        let processedGuests = 0;
        let iteration = 0;

        do {
          iteration++;
          const params: Record<string, string> = { event_api_id: eventId };
          if (cursor) {
            params.cursor = cursor;
          }

          const response = await lumaApiRequest("event/get-guests", params);

          if (response.entries) {
            for (const guest of response.entries) {
              processedGuests++;
              if (guest.approval_status === "approved") {
                await storage.upsertAttendance({
                  eventApiId: eventId,
                  userEmail: guest.email,
                  guestApiId: guest.guest_id,
                  approvalStatus: guest.approval_status,
                  registeredAt: guest.registered_at,
                  lastSyncedAt: new Date().toISOString(),
                });
              }

              // Calculate progress percentage (20-90%)
              const progress =
                20 +
                Math.floor(
                  (processedGuests / (totalGuests || response.entries.length)) *
                    70,
                );

              sendSSEUpdate(res, {
                type: "progress",
                message: `Processing guest ${processedGuests}: ${guest.email}`,
                progress,
                data: {
                  processedGuests,
                  totalGuests: totalGuests || response.entries.length,
                  currentEmail: guest.email,
                  status: guest.approval_status,
                },
              });
            }

            totalGuests = Math.max(totalGuests, processedGuests);
            cursor = response.next_cursor;
          }
        } while (cursor);

        // Update event sync timestamp
        await storage.updateEventAttendanceSync(eventId);

        sendSSEUpdate(res, {
          type: "complete",
          message: "Attendance sync completed successfully",
          progress: 100,
          data: {
            totalGuests: processedGuests,
            iterations: iteration,
          },
        });

        res.end();
      } catch (error) {
        console.error("Error during attendance sync:", error);
        sendSSEUpdate(res, {
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          progress: 0,
        });
        res.end();
      }
    } catch (error) {
      console.error("Failed to setup sync status stream:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to setup sync status stream" });
      }
    }
  });

  app.delete("/api/admin/events/:eventId/attendance", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.eventId;

      console.log("Clearing attendance for event:", eventId);

      const updatedEvent = await storage.clearEventAttendance(eventId);

      console.log("Successfully cleared attendance for event:", eventId);

      res.json({
        message: "Attendance cleared successfully",
        event: updatedEvent,
      });
    } catch (error) {
      console.error("Failed to clear event attendance:", error);
      res.status(500).json({
        error: "Failed to clear event attendance",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/events/:id/attendees", async (req, res) => {
    try {
      const eventId = req.params.id;

      // First get all attendees with their details
      const attendeesList = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          userName: people.userName,
          email: people.email,
          avatarUrl: people.avatarUrl,
        })
        .from(attendance)
        .leftJoin(people, eq(attendance.personId, people.id))
        .where(eq(attendance.eventApiId, eventId))
        .orderBy(sql`registered_at DESC`);

      // Get total count including those without profiles
      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(attendance)
        .where(eq(attendance.eventApiId, eventId));

      res.json({
        attendees: attendeesList,
        total: Number(totalCount[0]?.count || 0),
      });
    } catch (error) {
      console.error("Failed to fetch event attendees:", error);
      res.status(500).json({ error: "Failed to fetch event attendees" });
    }
  });

  app.patch("/api/auth/update-profile", async (req, res) => {
    try {
      console.log("🔵 Profile Update: Starting request processing", {
        sessionId: req.session?.id,
        userId: req.session?.userId,
        method: req.method,
        path: req.path,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });

      if (!req.session.userId) {
        console.log(
          "🔴 Profile Update: Authentication failed - No user ID in session",
        );
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("🟡 Profile Update: Processing request body", {
        userId: req.session.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        bodyKeys: Object.keys(req.body),
      });

      try {
        // Attempt to validate the incoming data
        const validationResult = updateUserProfileSchema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("🔴 Profile Update: Validation failed", {
            userId: req.session.userId,
            errors: validationResult.error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
            receivedData: req.body,
          });

          return res.status(400).json({
            error: "Invalid profile data",
            details: validationResult.error.errors,
          });
        }

        const userData = validationResult.data;
        console.log("🟢 Profile Update: Validation successful", {
          userId: req.session.userId,
          validatedFields: Object.keys(userData),
          validatedData: JSON.stringify(userData, null, 2),
        });

        // Attempt to update the user
        const updatedUser = await storage.updateUser(req.session.userId, {
          displayName: userData.displayName,
          bio: userData.bio ?? null,
          featuredImageUrl: userData.featuredImageUrl ?? null,
          companyName: userData.companyName ?? null,
          companyDescription: userData.companyDescription ?? null,
          address: userData.address ?? null,
          phoneNumber: userData.phoneNumber ?? null,
          isPhonePublic: userData.isPhonePublic ?? false,
          isEmailPublic: userData.isEmailPublic ?? false,
          ctaText: userData.ctaText ?? null,
          customLinks: userData.customLinks ?? [],
          tags: userData.tags ?? [],
        });

        console.log("🟢 Profile Update: Database update successful", {
          userId: updatedUser.id,
          updatedFields: Object.keys(updatedUser),
          result: JSON.stringify(updatedUser, null, 2),
        });

        return res.json(updatedUser);
      } catch (processingError) {
        console.error("🔴 Profile Update: Processing error", {
          userId: req.session.userId,
          error: {
            name: processingError.name,
            message: processingError.message,
            stack: processingError.stack,
            ...(processingError instanceof z.ZodError && {
              zodErrors: processingError.errors,
            }),
          },
          requestBody: JSON.stringify(req.body, null, 2),
        });
        throw processingError;
      }
    } catch (error) {
      console.error("🔴 Profile Update: Unhandled error", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userId: req.session?.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: "Failed to update profile",
        message: error.message,
      });
    }
  });

  app.get("/api/admin/events/:id/sync-status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.id;

      // Set up SSE connection
      initSSE(res);

      // Send initial status
      sendSSEUpdate(res, {
        type: "status",
        message: "Starting attendance sync...",
        progress: 0,
      });

      try {
        const event = await storage.getEventByApiId(eventId);
        if (!event) {
          sendSSEUpdate(res, {
            type: "error",
            message: "Event not found",
            progress: 0,
          });
          return res.end();
        }

        // Clear existing attendance records
        sendSSEUpdate(res, {
          type: "status",
          message: "Clearing existing attendance records...",
          progress: 10,
        });

        await storage.deleteAttendanceByEvent(eventId);

        // Fetch guests from Luma API
        sendSSEUpdate(res, {
          type: "status",
          message: "Fetching guest list from event platform...",
          progress: 20,
        });

        let cursor = null;
        let totalGuests = 0;
        let processedGuests = 0;
        let iteration = 0;

        do {
          iteration++;
          const params: Record<string, string> = { event_api_id: eventId };
          if (cursor) {
            params.cursor = cursor;
          }

          const response = await lumaApiRequest("event/get-guests", params);

          if (response.entries) {
            for (const guest of response.entries) {
              processedGuests++;
              if (guest.approval_status === "approved") {
                await storage.upsertAttendance({
                  eventApiId: eventId,
                  userEmail: guest.email,
                  guestApiId: guest.guest_id,
                  approvalStatus: guest.approval_status,
                  registeredAt: guest.registered_at,
                  lastSyncedAt: new Date().toISOString(),
                });
              }

              // Calculate progress percentage (20-90%)
              const progress =
                20 +
                Math.floor(
                  (processedGuests / (totalGuests || response.entries.length)) *
                    70,
                );

              sendSSEUpdate(res, {
                type: "progress",
                message: `Processing guest ${processedGuests}: ${guest.email}`,
                progress,
                data: {
                  processedGuests,
                  totalGuests: totalGuests || response.entries.length,
                  currentEmail: guest.email,
                  status: guest.approval_status,
                },
              });
            }

            totalGuests = Math.max(totalGuests, processedGuests);
            cursor = response.next_cursor;
          }
        } while (cursor);

        // Update event sync timestamp
        await storage.updateEventAttendanceSync(eventId);

        sendSSEUpdate(res, {
          type: "complete",
          message: "Attendance sync completed successfully",
          progress: 100,
          data: {
            totalGuests: processedGuests,
            iterations: iteration,
          },
        });

        res.end();
      } catch (error) {
        console.error("Error during attendance sync:", error);
        sendSSEUpdate(res, {
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
          progress: 0,
        });
        res.end();
      }
    } catch (error) {
      console.error("Failed to setup sync status stream:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to setup sync status stream" });
      }
    }
  });

  app.delete("/api/admin/events/:eventId/attendance", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const eventId = req.params.eventId;

      console.log("Clearing attendance for event:", eventId);

      const updatedEvent = await storage.clearEventAttendance(eventId);

      console.log("Successfully cleared attendance for event:", eventId);

      res.json({
        message: "Attendance cleared successfully",
        event: updatedEvent,
      });
    } catch (error) {
      console.error("Failed to clear event attendance:", error);
      res.status(500).json({
        error: "Failed to clear event attendance",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/events/:id/attendees", async (req, res) => {
    try {
      const eventId = req.params.id;

      // First get all attendees with their details
      const attendeesList = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          userName: people.userName,
          email: people.email,
          avatarUrl: people.avatarUrl,
        })
        .from(attendance)
        .leftJoin(people, eq(attendance.personId, people.id))
        .where(eq(attendance.eventApiId, eventId))
        .orderBy(sql`registered_at DESC`);

      // Get total count including those without profiles
      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(attendance)
        .where(eq(attendance.eventApiId, eventId));

      res.json({
        attendees: attendeesList,
        total: Number(totalCount[0]?.count || 0),
      });
    } catch (error) {
      console.error("Failed to fetch event attendees:", error);
      res.status(500).json({ error: "Failed to fetch event attendees" });
    }
  });

  app.patch("/api/auth/update-profile", async (req, res) => {
    try {
      console.log("🔵 Profile Update: Starting request processing", {
        sessionId: req.session?.id,
        userId: req.session?.userId,
        method: req.method,
        path: req.path,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });

      if (!req.session.userId) {
        console.log(
          "🔴 Profile Update: Authentication failed - No user ID in session",
        );
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log("🟡 Profile Update: Processing request body", {
        userId: req.session.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        bodyKeys: Object.keys(req.body),
      });

      try {
        // Attempt to validate the incoming data
        const validationResult = updateUserProfileSchema.safeParse(req.body);

        if (!validationResult.success) {
          console.error("🔴 Profile Update: Validation failed", {
            userId: req.session.userId,
            errors: validationResult.error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
            receivedData: req.body,
          });

          return res.status(400).json({
            error: "Invalid profile data",
            details: validationResult.error.errors,
          });
        }

        const userData = validationResult.data;
        console.log("🟢 Profile Update: Validation successful", {
          userId: req.session.userId,
          validatedFields: Object.keys(userData),
          validatedData: JSON.stringify(userData, null, 2),
        });

        // Attempt to update the user
        const updatedUser = await storage.updateUser(req.session.userId, {
          displayName: userData.displayName,
          bio: userData.bio ?? null,
          featuredImageUrl: userData.featuredImageUrl ?? null,
          companyName: userData.companyName ?? null,
          companyDescription: userData.companyDescription ?? null,
          address: userData.address ?? null,
          phoneNumber: userData.phoneNumber ?? null,
          isPhonePublic: userData.isPhonePublic ?? false,
          isEmailPublic: userData.isEmailPublic ?? false,
          ctaText: userData.ctaText ?? null,
          customLinks: userData.customLinks ?? [],
          tags: userData.tags ?? [],
        });

        console.log("🟢 Profile Update: Database update successful", {
          userId: updatedUser.id,
          updatedFields: Object.keys(updatedUser),
          result: JSON.stringify(updatedUser, null, 2),
        });

        return res.json(updatedUser);
      } catch (processingError) {
        console.error("🔴 Profile Update: Processing error", {
          userId: req.session.userId,
          error: {
            name: processingError.name,
            message: processingError.message,
            stack: processingError.stack,
            ...(processingError instanceof z.ZodError && {
              zodErrors: processingError.errors,
            }),
          },
          requestBody: JSON.stringify(req.body, null, 2),
        });
        throw processingError;
      }
    } catch (error) {
      console.error("🔴 Profile Update: Unhandled error", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userId: req.session?.userId,
        requestBody: JSON.stringify(req.body, null, 2),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: "Failed to update profile",
        message: error.message,
      });
    }
  });

  return createServer(app);
}
