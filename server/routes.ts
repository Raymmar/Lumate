import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { sendPasswordResetEmail } from "./email";
import { generateResetToken, hashPassword } from "./auth";
import uploadRouter from "./routes/upload";
import unsplashRouter from "./routes/unsplash";
import companiesRouter from "./routes/companies";
import { resendVerification } from "./routes/admin/resendVerification";
import { requireAuth as authenticateUser, requireAdmin } from "./routes/middleware";
// Company migration import removed
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
  companies,
  companyMembers,
  companyTags,
  industries,
  insertTimelineEventSchema,
  emailInvitations,
  insertPresentationSchema,
  insertSpeakerSchema,
  insertPresentationSpeakerSchema,
  insertAgendaTrackSchema,
  insertAgendaSessionTypeSchema,
  insertTimeBlockSchema,
} from "@shared/schema";
import { z } from "zod";
import { sendVerificationEmail } from "./email";
import { comparePasswords } from "./auth";
import { ZodError } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and, desc } from "drizzle-orm";
import { CacheService } from "./services/CacheService";
import stripeRouter from "./routes/stripe";
import { StripeService } from "./services/stripe";
import { badgeService } from "./services/BadgeService";
import { EmailInvitationService } from "./services/EmailInvitationService";

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
    "X-Accel-Buffering": "no" // Important for NGINX proxy
  });
  
  // Store this connection for later use
  const app = res.app;
  const connections = app.get('activeSSEConnections') || [];
  connections.push(res);
  app.set('activeSSEConnections', connections);
  
  // Set up connection close handler to clean up the connection
  res.on('close', () => {
    console.log('SSE connection closed');
    const currentConnections = app.get('activeSSEConnections') || [];
    const index = currentConnections.indexOf(res);
    if (index !== -1) {
      currentConnections.splice(index, 1);
      app.set('activeSSEConnections', currentConnections);
      console.log(`SSE connection removed, ${currentConnections.length} connections remaining`);
    }
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
  app.use("/api/companies", companiesRouter);
  
  // Resend verification email endpoint
  app.post("/api/admin/members/:id/resend-verification", resendVerification);

  // Manually trigger email invitation service
  app.post("/api/admin/trigger-email-invitations", requireAdmin, async (req, res) => {
    try {
      const emailService = EmailInvitationService.getInstance();
      await emailService.processInvitations();
      res.json({ success: true, message: 'Email invitation service triggered successfully' });
    } catch (error) {
      console.error('Error triggering email invitation service:', error);
      res.status(500).json({ error: 'Failed to trigger email invitation service' });
    }
  });

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

      // Enroll new user in email invitation workflow if they have a person record
      try {
        const person = await storage.getPersonByEmail(user.email);
        if (person) {
          const emailService = EmailInvitationService.getInstance();
          await emailService.enrollSpecificPeople([person.id]);
          console.log(`Enrolled new user ${user.email} in email invitation workflow`);
        }
      } catch (enrollError) {
        // Log but don't fail registration if enrollment fails
        console.error("Failed to enroll new user in email workflow:", {
          userId: user.id,
          email: user.email,
          error: enrollError,
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
  
  // Company migration endpoints have been removed as they are no longer needed

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

  // Helper function to format post title for URL
  function formatPostTitleForUrl(title: string | null, fallbackId: string): string {
    if (!title) return `p-${fallbackId}`;
    
    let processed = title
      .replace(/\./g, '')
      .replace(/&/g, 'and')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    
    if (!processed) {
      return `p-${fallbackId}`;
    }
    
    processed = processed
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return processed;
  }

  app.get("/api/posts/by-title/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      
      // First get all published posts to find the one with matching slug
      const allPosts = await db
        .select()
        .from(posts)
        .where(sql`${posts.status} = 'published' OR ${posts.status} IS NULL`);
      
      // Find post by matching slug
      const post = allPosts.find(p => formatPostTitleForUrl(p.title, p.id.toString()) === slug);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // If the post has a redirect URL and client accepts HTML, perform 301 redirect
      const acceptHeader = req.headers.accept || '';
      if (post.redirectUrl && acceptHeader.includes('text/html')) {
        return res.redirect(301, post.redirectUrl);
      }

      // Get creator info
      const creator = await storage.getUser(post.creatorId);

      // Get tags for the post
      const postTagsResult = await db
        .select({
          text: tags.text,
        })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, post.id));

      // If the post is members-only and user is not authenticated, hide the content but show metadata
      const isProtected = post.membersOnly && !req.session.userId;
      
      return res.json({
        ...post,
        body: isProtected ? "" : post.body,  // Hide content for protected posts
        isProtected,  // Flag to indicate content is protected
        creator: creator
          ? {
              id: creator.id,
              displayName: creator.displayName,
            }
          : null,
        tags: postTagsResult.map((tag) => tag.text),
      });
    } catch (error) {
      console.error("Failed to fetch post by slug:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get("/api/public/posts", async (req, res) => {
    try {
      console.log("Fetching public posts...");

      // Fetch all published posts from database (exclude drafts)
      console.log("Fetching all published posts from database...");
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
          redirectUrl: posts.redirectUrl,
          creatorId: posts.creatorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(sql`${posts.status} = 'published' OR ${posts.status} IS NULL`)
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

      const isLoggedIn = req.session.userId !== undefined;
      const postsHidingMemberContent = postsWithCreators.map((post) => {
        const hide = post.membersOnly && !isLoggedIn;
        if (hide) {
          return {
            ...post,
            body: "",
            ctaLink: "",
            ctaLabel: "",
            videoUrl: "",
          };
        } else {
          return post;
        }
      });

      console.log("Posts with creators and tags:", postsHidingMemberContent);

      res.json({ posts: postsHidingMemberContent });
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/sponsors", async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const sponsors = await storage.getSponsors(year);
      res.json({ sponsors });
    } catch (error) {
      console.error("Failed to fetch sponsors:", error);
      res.status(500).json({ error: "Failed to fetch sponsors" });
    }
  });

  app.post("/api/sponsors", requireAdmin, async (req, res) => {
    try {
      const sponsorData = req.body;
      const sponsor = await storage.createSponsor(sponsorData);
      res.json(sponsor);
    } catch (error) {
      console.error("Failed to create sponsor:", error);
      res.status(500).json({ error: "Failed to create sponsor" });
    }
  });

  app.patch("/api/sponsors/:id", requireAdmin, async (req, res) => {
    try {
      const sponsorId = parseInt(req.params.id);
      const sponsor = await storage.updateSponsor(sponsorId, req.body);
      res.json(sponsor);
    } catch (error) {
      console.error("Failed to update sponsor:", error);
      res.status(500).json({ error: "Failed to update sponsor" });
    }
  });

  app.delete("/api/sponsors/:id", requireAdmin, async (req, res) => {
    try {
      const sponsorId = parseInt(req.params.id);
      const userId = req.session.userId!;
      await storage.deleteSponsor(sponsorId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete sponsor:", error);
      res.status(500).json({ error: "Failed to delete sponsor" });
    }
  });

  // Image proxy for CORS - allows canvas operations on remote images
  const ALLOWED_IMAGE_HOSTS = [
    "file-upload.replit.app",
    "cdn.lu.ma",
    "images.lumacdn.com",
    "avatars.githubusercontent.com",
    "lh3.googleusercontent.com",
    "pbs.twimg.com",
    "media.licdn.com",
  ];

  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      // Security: Only allow whitelisted hosts to prevent SSRF
      if (!ALLOWED_IMAGE_HOSTS.includes(parsedUrl.hostname)) {
        console.warn(`Image proxy blocked request to: ${parsedUrl.hostname}`);
        return res.status(403).json({ error: "Host not allowed" });
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch image" });
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        return res.status(400).json({ error: "URL does not point to an image" });
      }

      const buffer = await response.arrayBuffer();
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Image proxy error:", error);
      res.status(500).json({ error: "Failed to proxy image" });
    }
  });

  // Timeline routes
  app.get("/api/timeline", async (req, res) => {
    try {
      const timelineEvents = await storage.getTimelineEvents();
      res.json({ events: timelineEvents });
    } catch (error) {
      console.error("Failed to fetch timeline events:", error);
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  });

  app.post("/api/timeline", requireAdmin, async (req, res) => {
    try {
      const result = insertTimelineEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid timeline event data", 
          details: result.error.format() 
        });
      }
      const timelineEvent = await storage.createTimelineEvent(result.data);
      res.json(timelineEvent);
    } catch (error) {
      console.error("Failed to create timeline event:", error);
      res.status(500).json({ error: "Failed to create timeline event" });
    }
  });

  app.patch("/api/timeline/:id", requireAdmin, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const result = insertTimelineEventSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid timeline event data", 
          details: result.error.format() 
        });
      }
      const timelineEvent = await storage.updateTimelineEvent(eventId, result.data);
      if (!timelineEvent) {
        return res.status(404).json({ error: "Timeline event not found" });
      }
      res.json(timelineEvent);
    } catch (error) {
      console.error("Failed to update timeline event:", error);
      res.status(500).json({ error: "Failed to update timeline event" });
    }
  });

  app.delete("/api/timeline/:id", requireAdmin, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteTimelineEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete timeline event:", error);
      res.status(500).json({ error: "Failed to delete timeline event" });
    }
  });

  // Agenda tracks routes
  app.get("/api/agenda-tracks", async (req, res) => {
    try {
      const tracks = await storage.getAgendaTracks();
      res.json({ tracks });
    } catch (error) {
      console.error("Failed to fetch agenda tracks:", error);
      res.status(500).json({ error: "Failed to fetch agenda tracks" });
    }
  });

  app.post("/api/agenda-tracks", requireAdmin, async (req, res) => {
    try {
      const result = insertAgendaTrackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid track data", 
          details: result.error.format() 
        });
      }
      const track = await storage.createAgendaTrack(result.data);
      res.json(track);
    } catch (error) {
      console.error("Failed to create agenda track:", error);
      res.status(500).json({ error: "Failed to create agenda track" });
    }
  });

  app.patch("/api/agenda-tracks/:id", requireAdmin, async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      const result = insertAgendaTrackSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid track data", 
          details: result.error.format() 
        });
      }
      const track = await storage.updateAgendaTrack(trackId, result.data);
      res.json(track);
    } catch (error) {
      console.error("Failed to update agenda track:", error);
      res.status(500).json({ error: "Failed to update agenda track" });
    }
  });

  app.delete("/api/agenda-tracks/:id", requireAdmin, async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      await storage.deleteAgendaTrack(trackId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete agenda track:", error);
      res.status(500).json({ error: "Failed to delete agenda track" });
    }
  });

  // Agenda session types routes
  app.get("/api/agenda-session-types", async (req, res) => {
    try {
      const sessionTypes = await storage.getAgendaSessionTypes();
      res.json({ sessionTypes });
    } catch (error) {
      console.error("Failed to fetch agenda session types:", error);
      res.status(500).json({ error: "Failed to fetch agenda session types" });
    }
  });

  app.post("/api/agenda-session-types", requireAdmin, async (req, res) => {
    try {
      const result = insertAgendaSessionTypeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid session type data", 
          details: result.error.format() 
        });
      }
      const sessionType = await storage.createAgendaSessionType(result.data);
      res.json(sessionType);
    } catch (error) {
      console.error("Failed to create agenda session type:", error);
      res.status(500).json({ error: "Failed to create agenda session type" });
    }
  });

  app.patch("/api/agenda-session-types/:id", requireAdmin, async (req, res) => {
    try {
      const sessionTypeId = parseInt(req.params.id);
      const result = insertAgendaSessionTypeSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid session type data", 
          details: result.error.format() 
        });
      }
      const sessionType = await storage.updateAgendaSessionType(sessionTypeId, result.data);
      res.json(sessionType);
    } catch (error) {
      console.error("Failed to update agenda session type:", error);
      res.status(500).json({ error: "Failed to update agenda session type" });
    }
  });

  app.delete("/api/agenda-session-types/:id", requireAdmin, async (req, res) => {
    try {
      const sessionTypeId = parseInt(req.params.id);
      await storage.deleteAgendaSessionType(sessionTypeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete agenda session type:", error);
      res.status(500).json({ error: "Failed to delete agenda session type" });
    }
  });

  // Time Block routes
  app.get("/api/time-blocks", async (req, res) => {
    try {
      const timeBlocks = await storage.getTimeBlocks();
      res.json({ timeBlocks });
    } catch (error) {
      console.error("Failed to fetch time blocks:", error);
      res.status(500).json({ error: "Failed to fetch time blocks" });
    }
  });

  app.get("/api/time-blocks/:id", async (req, res) => {
    try {
      const timeBlockId = parseInt(req.params.id);
      const timeBlock = await storage.getTimeBlockById(timeBlockId);
      if (!timeBlock) {
        return res.status(404).json({ error: "Time block not found" });
      }
      res.json({ timeBlock });
    } catch (error) {
      console.error("Failed to fetch time block:", error);
      res.status(500).json({ error: "Failed to fetch time block" });
    }
  });

  app.post("/api/time-blocks", requireAdmin, async (req, res) => {
    try {
      const result = insertTimeBlockSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid time block data", 
          details: result.error.format() 
        });
      }
      
      // Auto-compute displayOrder as max + 1
      const existingBlocks = await storage.getTimeBlocks();
      const maxDisplayOrder = existingBlocks.reduce((max, block) => 
        Math.max(max, block.displayOrder || 0), 0);
      
      const dataWithOrder = {
        ...result.data,
        displayOrder: result.data.displayOrder ?? maxDisplayOrder + 1,
      };
      
      const timeBlock = await storage.createTimeBlock(dataWithOrder);
      res.json(timeBlock);
    } catch (error) {
      console.error("Failed to create time block:", error);
      res.status(500).json({ error: "Failed to create time block" });
    }
  });

  app.patch("/api/time-blocks/:id", requireAdmin, async (req, res) => {
    try {
      const timeBlockId = parseInt(req.params.id);
      const result = insertTimeBlockSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid time block data", 
          details: result.error.format() 
        });
      }
      const timeBlock = await storage.updateTimeBlock(timeBlockId, result.data);
      res.json(timeBlock);
    } catch (error) {
      console.error("Failed to update time block:", error);
      res.status(500).json({ error: "Failed to update time block" });
    }
  });

  app.delete("/api/time-blocks/:id", requireAdmin, async (req, res) => {
    try {
      const timeBlockId = parseInt(req.params.id);
      await storage.deleteTimeBlock(timeBlockId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete time block:", error);
      res.status(500).json({ error: "Failed to delete time block" });
    }
  });

  // Backfill time blocks for existing presentations without them
  app.post("/api/admin/backfill-time-blocks", requireAdmin, async (req, res) => {
    try {
      const presentations = await storage.getPresentations();
      let existingBlocks = await storage.getTimeBlocks();
      
      let createdBlocks = 0;
      let assignedPresentations = 0;
      let skippedPresentations = 0;
      
      // Find presentations without time blocks
      const unassignedPresentations = presentations.filter(p => !p.timeBlockId);
      
      for (const pres of unassignedPresentations) {
        // Validate that presentation has valid start and end times
        if (!pres.startTime || !pres.endTime) {
          console.log(`Skipping presentation ${pres.id} - missing startTime or endTime`);
          skippedPresentations++;
          continue;
        }
        
        const presStartTime = new Date(pres.startTime);
        const presEndTime = new Date(pres.endTime);
        
        // Validate the dates are valid
        if (isNaN(presStartTime.getTime()) || isNaN(presEndTime.getTime())) {
          console.log(`Skipping presentation ${pres.id} - invalid date format`);
          skippedPresentations++;
          continue;
        }
        
        // Check if any existing time block covers this presentation's time range
        let matchingBlock = existingBlocks.find(block => {
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);
          return presStartTime >= blockStart && presEndTime <= blockEnd;
        });
        
        if (!matchingBlock) {
          // Create a new time block for this presentation
          const formatTime = (date: Date) => {
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
          };
          
          const autoTitle = `${formatTime(presStartTime)} – ${formatTime(presEndTime)}`;
          
          // Re-fetch blocks to get current max displayOrder (handles concurrent updates)
          existingBlocks = await storage.getTimeBlocks();
          const maxDisplayOrder = existingBlocks.reduce((max, block) => 
            Math.max(max, block.displayOrder || 0), 0);
          
          const newBlock = await storage.createTimeBlock({
            title: autoTitle,
            description: null,
            startTime: pres.startTime,
            endTime: pres.endTime,
            displayOrder: maxDisplayOrder + 1,
          });
          
          // Refresh the blocks list to include the new block
          existingBlocks = await storage.getTimeBlocks();
          createdBlocks++;
          matchingBlock = newBlock;
        }
        
        // Assign presentation to the block
        await storage.updatePresentation(pres.id, { timeBlockId: matchingBlock.id });
        assignedPresentations++;
      }
      
      res.json({ 
        success: true, 
        createdBlocks, 
        assignedPresentations,
        skippedPresentations,
        message: `Created ${createdBlocks} time blocks and assigned ${assignedPresentations} presentations${skippedPresentations > 0 ? ` (${skippedPresentations} skipped due to missing times)` : ''}` 
      });
    } catch (error) {
      console.error("Failed to backfill time blocks:", error);
      res.status(500).json({ error: "Failed to backfill time blocks" });
    }
  });

  // Presentation routes (summit agenda)
  app.get("/api/presentations", async (req, res) => {
    try {
      const presentations = await storage.getPresentations();
      res.json({ presentations });
    } catch (error) {
      console.error("Failed to fetch presentations:", error);
      res.status(500).json({ error: "Failed to fetch presentations" });
    }
  });

  app.get("/api/presentations/:id", async (req, res) => {
    try {
      const presentationId = parseInt(req.params.id);
      const presentation = await storage.getPresentationById(presentationId);
      if (!presentation) {
        return res.status(404).json({ error: "Presentation not found" });
      }
      res.json({ presentation });
    } catch (error) {
      console.error("Failed to fetch presentation:", error);
      res.status(500).json({ error: "Failed to fetch presentation" });
    }
  });

  app.post("/api/presentations", requireAdmin, async (req, res) => {
    try {
      const result = insertPresentationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid presentation data", 
          details: result.error.format() 
        });
      }
      
      let presentationData = result.data;
      
      // Auto-create or find time block if not provided
      if (!presentationData.timeBlockId) {
        const timeBlocks = await storage.getTimeBlocks();
        const presStartTime = new Date(presentationData.startTime);
        const presEndTime = new Date(presentationData.endTime);
        const presDate = presStartTime.toISOString().split('T')[0];
        
        // Find existing time block that covers this presentation's time
        const matchingBlock = timeBlocks.find(block => {
          const blockDate = new Date(block.startTime).toISOString().split('T')[0];
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);
          return blockDate === presDate && 
                 blockStart <= presStartTime && 
                 blockEnd >= presEndTime;
        });
        
        if (matchingBlock) {
          presentationData = { ...presentationData, timeBlockId: matchingBlock.id };
        } else {
          // Create a new time block with auto-generated title
          const formatTime = (date: Date) => {
            const h = date.getHours();
            const m = date.getMinutes();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
          };
          
          const newBlock = await storage.createTimeBlock({
            title: `${formatTime(presStartTime)} – ${formatTime(presEndTime)}`,
            description: null,
            startTime: presentationData.startTime,
            endTime: presentationData.endTime,
            displayOrder: 0,
          });
          presentationData = { ...presentationData, timeBlockId: newBlock.id };
        }
      }
      
      const presentation = await storage.createPresentation(presentationData);
      res.json(presentation);
    } catch (error) {
      console.error("Failed to create presentation:", error);
      res.status(500).json({ error: "Failed to create presentation" });
    }
  });

  app.patch("/api/presentations/:id", requireAdmin, async (req, res) => {
    try {
      const presentationId = parseInt(req.params.id);
      const result = insertPresentationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid presentation data", 
          details: result.error.format() 
        });
      }
      const presentation = await storage.updatePresentation(presentationId, result.data);
      res.json(presentation);
    } catch (error) {
      console.error("Failed to update presentation:", error);
      res.status(500).json({ error: "Failed to update presentation" });
    }
  });

  app.delete("/api/presentations/:id", requireAdmin, async (req, res) => {
    try {
      const presentationId = parseInt(req.params.id);
      await storage.deletePresentation(presentationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete presentation:", error);
      res.status(500).json({ error: "Failed to delete presentation" });
    }
  });

  // Speaker routes
  app.get("/api/speakers", async (req, res) => {
    try {
      const speakers = await storage.getSpeakers();
      res.json({ speakers });
    } catch (error) {
      console.error("Failed to fetch speakers:", error);
      res.status(500).json({ error: "Failed to fetch speakers" });
    }
  });

  app.get("/api/speakers/:id", async (req, res) => {
    try {
      const speakerId = parseInt(req.params.id);
      const speaker = await storage.getSpeakerById(speakerId);
      if (!speaker) {
        return res.status(404).json({ error: "Speaker not found" });
      }
      res.json({ speaker });
    } catch (error) {
      console.error("Failed to fetch speaker:", error);
      res.status(500).json({ error: "Failed to fetch speaker" });
    }
  });

  app.post("/api/speakers", requireAdmin, async (req, res) => {
    try {
      const result = insertSpeakerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid speaker data", 
          details: result.error.format() 
        });
      }
      const speaker = await storage.createSpeaker(result.data);
      res.json(speaker);
    } catch (error) {
      console.error("Failed to create speaker:", error);
      res.status(500).json({ error: "Failed to create speaker" });
    }
  });

  app.patch("/api/speakers/:id", requireAdmin, async (req, res) => {
    try {
      const speakerId = parseInt(req.params.id);
      const result = insertSpeakerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid speaker data", 
          details: result.error.format() 
        });
      }
      const speaker = await storage.updateSpeaker(speakerId, result.data);
      res.json(speaker);
    } catch (error) {
      console.error("Failed to update speaker:", error);
      res.status(500).json({ error: "Failed to update speaker" });
    }
  });

  app.delete("/api/speakers/:id", requireAdmin, async (req, res) => {
    try {
      const speakerId = parseInt(req.params.id);
      await storage.deleteSpeaker(speakerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete speaker:", error);
      res.status(500).json({ error: "Failed to delete speaker" });
    }
  });

  // Presentation-Speaker relationship routes
  app.post("/api/presentations/:id/speakers", requireAdmin, async (req, res) => {
    try {
      const presentationId = parseInt(req.params.id);
      const result = insertPresentationSpeakerSchema.safeParse({
        ...req.body,
        presentationId,
      });
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid data", 
          details: result.error.format() 
        });
      }
      const presentationSpeaker = await storage.addSpeakerToPresentation(result.data);
      res.json(presentationSpeaker);
    } catch (error) {
      console.error("Failed to add speaker to presentation:", error);
      res.status(500).json({ error: "Failed to add speaker to presentation" });
    }
  });

  app.patch("/api/presentations/:presentationId/speakers/:speakerId", requireAdmin, async (req, res) => {
    try {
      const presentationId = parseInt(req.params.presentationId);
      const speakerId = parseInt(req.params.speakerId);
      const presentationSpeaker = await storage.updatePresentationSpeaker(presentationId, speakerId, req.body);
      res.json(presentationSpeaker);
    } catch (error) {
      console.error("Failed to update presentation speaker:", error);
      res.status(500).json({ error: "Failed to update presentation speaker" });
    }
  });

  app.delete("/api/presentations/:presentationId/speakers/:speakerId", requireAdmin, async (req, res) => {
    try {
      const presentationId = parseInt(req.params.presentationId);
      const speakerId = parseInt(req.params.speakerId);
      await storage.removeSpeakerFromPresentation(presentationId, speakerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove speaker from presentation:", error);
      res.status(500).json({ error: "Failed to remove speaker from presentation" });
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

  function formatEventTitleForUrl(title: string | null, fallbackId: string): string {
    if (!title) return `e-${fallbackId}`;
    
    let processed = title
      .replace(/\./g, '')
      .replace(/&/g, 'and')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
    
    if (!processed) {
      return `e-${fallbackId}`;
    }
    
    processed = processed
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return processed;
  }

  app.get("/api/events/by-title/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      
      const allEvents = await storage.getEvents();
      
      const event = allEvents.find(e => formatEventTitleForUrl(e.title, e.api_id) === slug);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.json(event);
    } catch (error) {
      console.error("Failed to fetch event by slug:", error);
      res.status(500).json({ error: "Failed to fetch event" });
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

      const event = await storage.getEventByApiId(event_api_id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.visibility === 'private') {
        return res.status(403).json({ error: "Cannot RSVP to private events" });
      }

      // Redirect users to Luma event page to register/purchase tickets
      res.json({ 
        redirect: true,
        eventUrl: event.url,
      });
    } catch (error) {
      console.error("Failed to process RSVP request:", error);
      res.status(500).json({
        error: "Failed to process RSVP request",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });


  app.get("/api/people", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const searchQuery = ((req.query.search as string) || "").toLowerCase();
      const sort = req.query.sort as string;
      const verifiedOnly = req.query.verifiedOnly === "true";

      console.log(
        "Fetching people from storage with search:",
        searchQuery,
        "sort:",
        sort,
        "verifiedOnly:",
        verifiedOnly,
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

      // Include all users but capture verification status
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
          createdAt: people.createdAt,
        })
        .from(people);
      
      // If verifiedOnly is true, only show verified users
      // Otherwise, get all users but we'll add verification status later
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
            sql`(LOWER(people.user_name) LIKE ${`%${searchQuery}%`} OR LOWER(people.email) LIKE ${`%${searchQuery}%`})`,
          );
        } else {
          // For all users (when verified flag is not set)
          query = query.where(
            sql`(LOWER(user_name) LIKE ${`%${searchQuery}%`} OR LOWER(email) LIKE ${`%${searchQuery}%`})`,
          );
        }
      }

      const allPeople = await query;
      
      // Check verification status for each person and add it to the response
      const peopleWithVerification = await Promise.all(
        allPeople.map(async (person) => {
          const userCheckResult = await db
            .select()
            .from(users)
            .where(and(
              eq(users.personId, person.id),
              eq(users.isVerified, true)
            ))
            .limit(1);
            
          return {
            ...person,
            isVerified: userCheckResult.length > 0
          };
        })
      );
      
      // Sort by created_at descending (newest first)
      peopleWithVerification.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      if (sort === "events") {
        const sortedPeople = peopleWithVerification.sort((a, b) => {
          // Sort by event count
          const aCount = countMap.get(a.email.toLowerCase())?.event_count || 0;
          const bCount = countMap.get(b.email.toLowerCase())?.event_count || 0;

          if (bCount !== aCount) {
            return bCount - aCount;
          }

          // If event count is tied, sort by most recent attendance
          const aDate =
            countMap.get(a.email.toLowerCase())?.last_attended || "1970-01-01";
          const bDate =
            countMap.get(b.email.toLowerCase())?.last_attended || "1970-01-01";
          const dateComparison = new Date(bDate).getTime() - new Date(aDate).getTime();
          
          if (dateComparison !== 0) {
            return dateComparison;
          }
          
          // If still tied, maintain the original created_at order from database
          return 0;
        });

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedPeople = sortedPeople.slice(start, end).map((p) => {
          return { ...p, email: "" };
        });

        console.log(
          `Returning sorted verified people from index ${start} to ${end - 1}, total: ${sortedPeople.length}`,
        );

        res.json({
          people: paginatedPeople,
          total: sortedPeople.length,
        });
        return;
      }

      // Already sorted by created_at DESC above
      const sortedPeopleByVerification = peopleWithVerification;
      
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedPeople = sortedPeopleByVerification.slice(start, end).map((p) => {
        return { ...p, email: "" };
      });
      console.log(
        `Returning paginated people (verified first), total: ${sortedPeopleByVerification.length}`,
      );

      res.json({
        people: paginatedPeople,
        total: sortedPeopleByVerification.length,
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
        return res.json({
          message: "If an account exists, a password reset email will be sent",
        });
      }

      console.log("Processing password reset request for email:", email, {
        userId: user.id,
        hasDisplayName: !!user.displayName,
        email: user.email,
      });

      // Delete any existing reset tokens for this email
      await storage.deletePasswordResetTokensByEmail(email);

      // Generate and store new reset token
      const token = await generateResetToken();
      const verificationToken = await storage.createPasswordResetToken(
        email,
        token,
      );

      console.log("Created password reset token:", {
        email,
        tokenId: verificationToken.id,
        expiresAt: verificationToken.expiresAt,
        userDetails: {
          id: user.id,
          hasDisplayName: !!user.displayName,
        },
      });

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, token);
      if (!emailSent) {
        console.error("Failed to send password reset email to:", email, {
          userId: user.id,
          hasDisplayName: !!user.displayName,
        });
        throw new Error("Failed to send password reset email");
      }

      console.log("Successfully processed password reset request for:", email);
      res.json({
        message: "If an account exists, a password reset email will be sent",
      });
    } catch (error: any) {
      console.error("Password reset request error:", {
        error: error.message,
        code: error.code,
        response: error.response?.body,
        stack: error.stack,
      });
      res
        .status(500)
        .json({ error: "Failed to process password reset request" });
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
          details:
            error instanceof Error
              ? error.message
              : "Password validation failed",
        });
      }

      // Validate token
      const verificationToken = await storage.validatePasswordResetToken(token);
      if (!verificationToken) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
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

  // Admin endpoint for creating a company with specified owner
  app.post("/api/admin/companies", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Extract the owner user ID and selected members from the request body
      const { _ownerUserId, _selectedMembers, customLinks, ...companyData } = req.body;
      
      // Validate the company data - remove metadata fields that aren't part of the schema
      const validCompanyData = {
        name: companyData.name || "",
        industry: companyData.industry || null,
        size: companyData.size || null,
        email: companyData.email || null,
        isEmailPublic: companyData.isEmailPublic || false,
        phoneNumber: companyData.phoneNumber || null,
        isPhonePublic: companyData.isPhonePublic || false,
        website: companyData.website || null,
        address: companyData.address || null,
        description: companyData.description || null,
        bio: companyData.bio || null,
        founded: companyData.founded || null,
        logoUrl: companyData.logoUrl || null,
        featuredImageUrl: companyData.featuredImageUrl || null,
        customLinks: customLinks || null,
      };
      
      // Generate a slug for the company
      const generateSlug = (name: string): string => {
        return name
          .replace(/\./g, '') // Remove periods
          .replace(/&/g, 'and') // Replace & with 'and'
          .normalize('NFKD') // Normalize Unicode characters
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
          .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-{2,}/g, '-') // Collapse multiple hyphens
          .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
      };
      
      // Add the slug to the company data
      if (validCompanyData.name) {
        validCompanyData.slug = generateSlug(validCompanyData.name);
        console.log(`Generated slug "${validCompanyData.slug}" for new company "${validCompanyData.name}"`);
      }
      
      // Create the company
      const company = await storage.createCompany(validCompanyData);
      console.log("Created company:", company);
      
      // Process member assignments if provided
      try {
        if (_selectedMembers && Array.isArray(_selectedMembers) && _selectedMembers.length > 0) {
          console.log(`Adding ${_selectedMembers.length} members to company ${company.id}`);
          
          for (const memberId of _selectedMembers) {
            // Determine if this member is the owner (using loose equality to handle string/number conversion)
            const isOwner = _ownerUserId && Number(memberId) === Number(_ownerUserId);
            const role = isOwner ? "owner" : "member";
            
            console.log(`Adding member ${memberId} as ${role} to company ${company.id}`);
            
            await storage.addMemberToCompany({
              companyId: company.id,
              userId: Number(memberId),
              role: role,
              title: isOwner ? "Owner" : "Member",
              isPublic: true,
              addedBy: req.session.userId
            });
          }
        }
      } catch (memberError) {
        console.error("Error assigning members to company:", memberError);
        // Don't fail the entire operation if member assignment fails
      }
      
      return res.status(201).json({ company });
    } catch (error) {
      console.error("Failed to create company via admin API:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Failed to create company", details: String(error) });
    }
  });

  app.get("/api/admin/companies", async (req, res) => {
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
        .from(companies)
        .where(
          searchQuery
            ? sql`(
              LOWER(name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(industry, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(email, '')) LIKE ${`%${searchQuery}%`}
            )`
            : sql`1=1`,
        )
        .then((result) => result[0].count);

      const companiesResult = await db
        .select({
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          size: companies.size,
          email: companies.email,
          phoneNumber: companies.phoneNumber,
          website: companies.website,
          logoUrl: companies.logoUrl,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
        })
        .from(companies)
        .where(
          searchQuery
            ? sql`(
              LOWER(name) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(industry, '')) LIKE ${`%${searchQuery}%`} OR 
              LOWER(COALESCE(email, '')) LIKE ${`%${searchQuery}%`}
            )`
            : sql`1=1`,
        )
        .limit(limit)
        .offset(offset)
        .orderBy(companies.name);

      // Get the member count for each company
      const companiesWithMemberCount = await Promise.all(
        companiesResult.map(async (company) => {
          const members = await storage.getCompanyMembers(company.id);
          return {
            ...company,
            memberCount: members.length,
          };
        })
      );

      res.json({
        companies: companiesWithMemberCount,
        total: totalCount,
      });
    } catch (error) {
      console.error("Failed to fetch admin companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/admin/companies/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const companyId = parseInt(req.params.id);
      const company = await storage.getCompanyById(companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get company members
      const members = await storage.getCompanyMembers(companyId);
      
      // Get company tags
      const tags = await storage.getCompanyTags(companyId);

      res.json({
        ...company,
        members,
        tags,
      });
    } catch (error) {
      console.error("Failed to fetch company details:", error);
      res.status(500).json({ error: "Failed to fetch company details" });
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
  
  app.get("/api/badges/:badgeName/users", async (req, res) => {
    try {
      const badgeName = req.params.badgeName;
      console.log(`Fetching users with '${badgeName}' badge`);
      
      // First, find the badge ID
      const badge = await db
        .select()
        .from(badges)
        .where(sql`LOWER(name) = LOWER(${badgeName})`)
        .limit(1);
      
      if (!badge[0]) {
        console.log(`Badge '${badgeName}' not found`);
        return res.status(404).json({ error: "Badge not found" });
      }
      
      // Get user IDs with this badge
      const userBadgeAssignments = await db
        .select({
          userId: userBadgesTable.userId,
        })
        .from(userBadgesTable)
        .where(eq(userBadgesTable.badgeId, badge[0].id));
      
      if (userBadgeAssignments.length === 0) {
        console.log(`No users found with badge '${badgeName}'`);
        return res.json({ users: [] });
      }
      
      const userIds = userBadgeAssignments.map(ub => ub.userId);
      
      // Get full user data with person information
      const usersWithData = await Promise.all(
        userIds.map(async (userId) => {
          const user = await storage.getUserWithPerson(userId);
          if (!user) return null;
          
          return {
            id: user.id,
            displayName: user.displayName || user.email,
            email: user.email,
            person: user.person ? {
              id: user.person.id,
              userName: user.person.userName,
              avatarUrl: user.person.avatarUrl
            } : null
          };
        })
      );
      
      // Filter out null values and sort by display name
      const filteredUsers = usersWithData
        .filter(user => user !== null)
        .sort((a, b) => {
          const nameA = a.displayName || a.email;
          const nameB = b.displayName || b.email;
          return nameA.localeCompare(nameB);
        });
      
      console.log(`Found ${filteredUsers.length} users with badge '${badgeName}'`);
      
      return res.json({ 
        badge: badge[0],
        users: filteredUsers 
      });
    } catch (error) {
      console.error(`Failed to fetch users with badge:`, error);
      return res.status(500).json({ error: "Failed to fetch users with badge" });
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
  
  // Get unclaimed people (for admin member creation)
  app.get("/api/admin/people/unclaimed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const searchQuery = (req.query.search as string || "").toLowerCase();
      
      console.log(`Fetching unclaimed people records ${searchQuery ? `with search: '${searchQuery}'` : ''}`);

      // Find people records that don't have an associated user account
      const unclaimedPeople = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          email: people.email,
          userName: people.userName,
          avatarUrl: people.avatarUrl,
          role: people.role,
        })
        .from(people)
        .leftJoin(users, eq(people.email, users.email))
        .where(
          and(
            sql`${users.id} IS NULL`,
            searchQuery
              ? sql`(LOWER(${people.email}) LIKE ${`%${searchQuery}%`} OR 
                     LOWER(${people.userName}) LIKE ${`%${searchQuery}%`})`
              : undefined
          )
        )
        .orderBy(people.email);

      console.log(`Returned ${unclaimedPeople.length} unclaimed people records`);
      res.json(unclaimedPeople);
    } catch (error) {
      console.error("Failed to fetch unclaimed people:", error);
      res.status(500).json({ error: "Failed to fetch unclaimed people" });
    }
  });

  // Batch invite unclaimed people (admin only)
  app.post("/api/admin/batch-invite-people", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { personIds } = req.body;
      
      if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
        return res.status(400).json({ error: "personIds array is required" });
      }

      console.log(`Starting batch invite for ${personIds.length} people...`);
      
      // Use the email invitation service to enroll these people
      const emailService = EmailInvitationService.getInstance();
      await emailService.enrollSpecificPeople(personIds);

      return res.json({
        success: true,
        message: `Batch invite initiated for ${personIds.length} people. Check server logs for details.`,
        totalPeople: personIds.length
      });

    } catch (error) {
      console.error("Failed to send batch invites:", error);
      return res.status(500).json({ 
        error: "Failed to send batch invites", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reconcile user-invitation data (admin only)
  app.post("/api/admin/reconcile-invitations", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      console.log('Starting user-invitation reconciliation...');
      
      const emailService = EmailInvitationService.getInstance();
      const stats = await emailService.reconcileUserInvitations();

      return res.json({
        success: true,
        message: `Reconciliation complete: Created ${stats.created} records (${stats.completed} completed, ${stats.enrolled} enrolled), reset ${stats.reset} broken records, skipped ${stats.skipped}, errors: ${stats.errors}`,
        stats
      });

    } catch (error) {
      console.error("Failed to reconcile invitations:", error);
      return res.status(500).json({ 
        error: "Failed to reconcile invitations", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create a new member account (admin only)
  app.post("/api/admin/members", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { email, displayName, bio, personId, isAdmin } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ error: "A user with this email already exists" });
      }

      console.log("Creating new member account:", {
        email: normalizedEmail,
        displayName,
        linkedToExistingPerson: !!personId,
        personId,
      });
      
      let personRecord: any = null;
      
      // Link to existing person record if provided
      if (personId) {
        personRecord = await storage.getPerson(parseInt(personId));
        if (!personRecord) {
          return res.status(404).json({ error: "Person record not found" });
        }
        
        // Verify email matches
        if (personRecord.email && personRecord.email.toLowerCase() !== normalizedEmail) {
          return res.status(400).json({ 
            error: "Email does not match the selected person record" 
          });
        }
      }
      
      // First, try to find existing person by email if personId isn't provided
      let finalPersonId = undefined;
      
      if (personId) {
        // If personId is provided, use it directly
        finalPersonId = parseInt(personId);
      } else {
        // Otherwise, try to find existing person by email
        const existingPerson = await storage.getPersonByEmail(normalizedEmail);
        if (existingPerson) {
          console.log("Found existing person record by email:", {
            email: normalizedEmail,
            personId: existingPerson.id
          });
          finalPersonId = existingPerson.id;
        } else {
          console.log("No existing person record found for email:", normalizedEmail);
          // Will be linked after event invitation and sync
        }
      }
      
      // Get the display name from the person record if available
      let userDisplayName = displayName;
      
      // If we have a person record, prioritize using their userName as the display name
      if (personRecord && personRecord.userName) {
        userDisplayName = personRecord.userName;
      } else if (finalPersonId) {
        // We might have a person ID but not the full record loaded
        const linkedPerson = await storage.getPerson(finalPersonId);
        if (linkedPerson && linkedPerson.userName) {
          userDisplayName = linkedPerson.userName;
        }
      }
      
      // Create user with basic info
      const userData = {
        email: normalizedEmail,
        displayName: userDisplayName || null, // Use person's userName or provided displayName
        bio: bio || null,
        personId: finalPersonId, // Use the resolved person ID (existing record or undefined)
        password: "", // Empty password - will be set during verification
      };
      
      // Create the user
      const newUser = await storage.createUser(userData);
      
      // Then update verification and admin status separately
      if (isAdmin) {
        await storage.updateUserAdminStatus(newUser.id, true);
      }
      
      console.log("Successfully created new user:", {
        userId: newUser.id,
        email: newUser.email,
      });
      
      // Generate verification token
      const verificationToken = await storage.createVerificationToken(normalizedEmail);
      console.log("Created verification token:", verificationToken.token);
      
      // Get the next upcoming event to include in the email (not for automatic invite)
      const futureEvents = await storage.getFutureEvents();
      const nextEvent = futureEvents.length > 0 
        ? futureEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
        : null;
      
      // Prepare event info for email if available
      const eventInfo = nextEvent ? {
        title: nextEvent.title,
        url: nextEvent.url || '',
        startTime: nextEvent.startTime
      } : undefined;
      
      // Send verification email with event info
      const emailSent = await sendVerificationEmail(
        normalizedEmail,
        verificationToken.token,
        true, // adminCreated flag to modify message
        -1, // Use legacy template
        eventInfo // Include event info in email
      );
      
      if (!emailSent) {
        console.error("Failed to send verification email to:", normalizedEmail);
      } else {
        console.log("Successfully sent verification email to:", normalizedEmail, "with event:", eventInfo?.title || 'none');
      }
      
      res.status(201).json({
        success: true,
        message: "Member created successfully. Verification email sent with event information.",
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          isAdmin: newUser.isAdmin,
          isVerified: newUser.isVerified,
        },
      });
    } catch (error) {
      console.error("Failed to create member:", error);
      res.status(500).json({ 
        error: "Failed to create member",
        message: error instanceof Error ? error.message : String(error),
      });
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
  
  // Get the featured member
  app.get("/api/people/featured", async (req, res) => {
    try {
      const featuredMember = await storage.getFeaturedMember();
      if (!featuredMember) {
        return res.status(404).json({ error: "No featured member found" });
      }
      res.json(featuredMember);
    } catch (error) {
      console.error("Error fetching featured member:", error);
      res.status(500).json({ error: "Failed to retrieve featured member" });
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
        // Instead of auto-inviting via Luma API (which bypasses ticket purchases),
        // just return the next event URL so users can register there
        try {
          const events = await storage.getEvents();
          const nextEvent = events.find(
            (e) => new Date(e.startTime) > new Date(),
          );

          if (nextEvent) {
            console.log("Profile not found, returning event link (not sending Luma invite):", {
              email: normalizedEmail,
              eventUrl: nextEvent.url,
            });

            return res.json({
              status: "not_found",
              message:
                "We couldn't find your profile. Check out our next event and register to join our community!",
              nextEvent: {
                title: nextEvent.title,
                startTime: nextEvent.startTime,
                url: nextEvent.url,
              },
            });
          }
        } catch (error) {
          console.error("Failed to fetch next event:", error);
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

      // Create or update email invitation record to mark as completed
      try {
        const person = await storage.getPersonByEmail(email.toLowerCase());
        if (person) {
          const existingInvitation = await storage.getEmailInvitationByPersonId(person.id);
          if (existingInvitation) {
            // Update existing invitation to mark as completed
            if (!existingInvitation.completedAt) {
              await storage.updateEmailInvitation(existingInvitation.id, {
                completedAt: new Date().toISOString(),
                nextSendAt: null
              });
              console.log(`Marked invitation as completed for ${email}`);
            }
          } else {
            // Create new completed invitation record
            await storage.createEmailInvitation({
              personId: person.id,
              emailsSentCount: 0,
              lastSentAt: null,
              nextSendAt: null,
              optedOut: false,
              finalMessageSent: false,
              completedAt: new Date().toISOString()
            });
            console.log(`Created completed invitation record for ${email}`);
          }
        }
      } catch (invitationError) {
        // Log but don't fail verification if invitation record creation fails
        console.error("Failed to create/update invitation record:", invitationError);
      }

      // Check if user should get premium access from tickets
      try {
        const { checkAndGrantPremiumFromTickets } = await import("./utils/premiumCheck.js");
        const premiumResult = await checkAndGrantPremiumFromTickets(verifiedUser.id);
        if (premiumResult.granted) {
          console.log(`Granted premium access to new user ${email} from Luma tickets`);
        }
      } catch (premiumError) {
        // Log but don't fail account creation if premium check fails
        console.error("Failed to check premium access for new user:", premiumError);
      }

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
      let displayName = user.displayName;
      
      if (user.personId) {
        const person = await storage.getPerson(user.personId);
        if (person) {
          api_id = person.api_id;
          // Use person's userName as fallback if user displayName is not set
          if (!displayName && person.userName) {
            displayName = person.userName;
          }
        }
      }

      return res.json({
        id: user.id,
        email: user.email,
        displayName,
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

      // Get display name with fallback to linked person's userName
      let displayName = user.displayName;
      if (!displayName && user.personId) {
        const person = await storage.getPerson(user.personId);
        if (person?.userName) {
          displayName = person.userName;
        }
      }

      return res.json({
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          displayName,
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
        return res.status(403).json({
          error: "Forbidden. This endpoint is restricted to internal use only.",
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

      const [eventCount, peopleCount, userCount, totalAttendeesCount, paidUsersCount] =
        await Promise.all([
          storage.getEventCount(),
          storage.getPeopleCount(),
          storage.getUserCount(),
          storage.getTotalAttendeesCount(),
          storage.getPaidUsersCount(),
        ]);

      res.json({
        events: eventCount,
        people: peopleCount,
        users: userCount,
        uniqueAttendees: peopleCount,
        totalAttendees: totalAttendeesCount,
        paidUsers: paidUsersCount,
      });
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Comprehensive member stats endpoint with breakdown by source
  app.get("/api/admin/member-stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const memberStats = await storage.getActiveMemberStats();
      res.json(memberStats);
    } catch (error) {
      console.error("Failed to fetch member stats:", error);
      res.status(500).json({ error: "Failed to fetch member stats" });
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
      const workflowFilter = req.query.workflowStatus as string | undefined;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];
      if (searchQuery) {
        whereConditions.push(sql`(
          LOWER(${people.userName}) LIKE ${`%${searchQuery}%`} OR 
          LOWER(${people.fullName}) LIKE ${`%${searchQuery}%`} OR 
          LOWER(${people.email}) LIKE ${`%${searchQuery}%`}
        )`);
      }

      // Add workflow filter conditions
      if (workflowFilter === 'not_started') {
        whereConditions.push(sql`${emailInvitations.id} IS NULL`);
      } else if (workflowFilter === 'in_progress') {
        whereConditions.push(sql`${emailInvitations.id} IS NOT NULL AND ${emailInvitations.completedAt} IS NULL AND ${emailInvitations.optedOut} = false`);
      } else if (workflowFilter === 'completed') {
        whereConditions.push(sql`${emailInvitations.completedAt} IS NOT NULL`);
      } else if (workflowFilter === 'opted_out') {
        whereConditions.push(sql`${emailInvitations.optedOut} = true`);
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Count total
      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(people)
        .leftJoin(users, eq(people.email, users.email))
        .leftJoin(emailInvitations, eq(people.id, emailInvitations.personId))
        .where(whereClause)
        .then((result) => Number(result[0].count));

      // Fetch people with workflow data
      const results = await db
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
          createdAt: people.createdAt,
          stats: people.stats,
          hasUser: sql<boolean>`${users.id} IS NOT NULL`,
          invitationId: emailInvitations.id,
          emailsSentCount: emailInvitations.emailsSentCount,
          lastSentAt: emailInvitations.lastSentAt,
          nextSendAt: emailInvitations.nextSendAt,
          completedAt: emailInvitations.completedAt,
          optedOut: emailInvitations.optedOut,
        })
        .from(people)
        .leftJoin(users, eq(people.email, users.email))
        .leftJoin(emailInvitations, eq(people.id, emailInvitations.personId))
        .where(whereClause)
        .orderBy(desc(people.createdAt))
        .limit(limit)
        .offset(offset);

      // Transform to PersonWithWorkflow objects
      const peopleWithWorkflow = results.map(row => {
        let workflowStatus: 'not_started' | 'in_progress' | 'completed' | 'opted_out' = 'not_started';
        
        if (row.optedOut) {
          workflowStatus = 'opted_out';
        } else if (row.completedAt) {
          workflowStatus = 'completed';
        } else if (row.invitationId) {
          workflowStatus = 'in_progress';
        }

        return {
          id: row.id,
          api_id: row.api_id,
          email: row.email,
          userName: row.userName,
          fullName: row.fullName,
          avatarUrl: row.avatarUrl,
          role: row.role,
          phoneNumber: row.phoneNumber,
          bio: row.bio,
          createdAt: row.createdAt,
          stats: row.stats,
          hasUser: Boolean(row.hasUser),
          workflowStatus,
          emailsSentCount: row.emailsSentCount || 0,
          lastSentAt: row.lastSentAt,
          nextSendAt: row.nextSendAt,
          completedAt: row.completedAt,
          invitationId: row.invitationId,
        };
      });

      res.json({
        people: peopleWithWorkflow,
        total: totalCount,
      });
    } catch (error) {
      console.error("Failed to fetch people:", error);
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  // Get workflow stats
  app.get("/api/admin/workflow-stats", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get total people count
      const totalPeopleResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(people);
      const totalPeople = Number(totalPeopleResult[0].count);

      // Get verified users count (users who completed account setup)
      const verifiedUsersResult = await db
        .select({ count: sql<number>`count(DISTINCT ${users.id})` })
        .from(users)
        .innerJoin(people, eq(users.email, people.email))
        .where(eq(users.isVerified, true));
      const verifiedUsers = Number(verifiedUsersResult[0].count);

      // Get pending users count (users who claimed but haven't verified)
      const pendingUsersResult = await db
        .select({ count: sql<number>`count(DISTINCT ${users.id})` })
        .from(users)
        .innerJoin(people, eq(users.email, people.email))
        .where(eq(users.isVerified, false));
      const pendingUsers = Number(pendingUsersResult[0].count);

      // Get in workflow count
      const inWorkflowResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailInvitations)
        .where(and(
          sql`${emailInvitations.completedAt} IS NULL`,
          eq(emailInvitations.optedOut, false)
        ));
      const inWorkflow = Number(inWorkflowResult[0].count);

      // Get completed workflow count
      const completedWorkflowResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailInvitations)
        .where(sql`${emailInvitations.completedAt} IS NOT NULL`);
      const completedWorkflow = Number(completedWorkflowResult[0].count);

      // Get opted out count
      const optedOutResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailInvitations)
        .where(eq(emailInvitations.optedOut, true));
      const optedOut = Number(optedOutResult[0].count);

      // Get total invites sent
      const totalInvitesSentResult = await db
        .select({ total: sql<number>`sum(${emailInvitations.emailsSentCount})` })
        .from(emailInvitations);
      const totalInvitesSent = Number(totalInvitesSentResult[0].total || 0);

      // Calculate conversion rate (verified users / total people)
      const conversionRate = totalPeople > 0 ? (verifiedUsers / totalPeople) * 100 : 0;

      res.json({
        totalPeople,
        verifiedUsers,
        pendingUsers,
        inWorkflow,
        completedWorkflow,
        optedOut,
        totalInvitesSent,
        conversionRate: Math.round(conversionRate * 10) / 10,
      });
    } catch (error) {
      console.error("Failed to fetch workflow stats:", error);
      res.status(500).json({ error: "Failed to fetch workflow stats" });
    }
  });

  // Enroll selected people in workflow
  app.post("/api/admin/enroll-in-workflow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { personIds } = req.body as { personIds: number[] };

      if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
        return res.status(400).json({ error: "No people selected" });
      }

      console.log(`Enrolling ${personIds.length} people in workflow...`);

      let enrolled = 0;
      let skipped = 0;
      const errors = [];

      for (const personId of personIds) {
        try {
          // Check if person already has an invitation
          const existingInvitation = await storage.getEmailInvitationByPersonId(personId);
          
          if (existingInvitation) {
            console.log(`Person ${personId} already has an invitation, skipping`);
            skipped++;
            continue;
          }

          // Check if person has a user account already
          const person = await storage.getPerson(personId);
          if (!person) {
            console.log(`Person ${personId} not found, skipping`);
            skipped++;
            continue;
          }

          const existingUser = await storage.getUserByEmail(person.email);
          if (existingUser) {
            console.log(`Person ${person.email} already has a user account, skipping`);
            skipped++;
            continue;
          }

          // Create email invitation record
          await storage.createEmailInvitation({
            personId,
            emailsSentCount: 0,
            optedOut: false,
            finalMessageSent: false,
          });

          enrolled++;
          console.log(`Enrolled person ${personId} in workflow`);
        } catch (error) {
          console.error(`Failed to enroll person ${personId}:`, error);
          errors.push({ personId, error: error instanceof Error ? error.message : String(error) });
        }
      }

      res.json({
        success: true,
        enrolled,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        message: `Enrolled ${enrolled} people in workflow${skipped > 0 ? `, skipped ${skipped}` : ''}`,
      });
    } catch (error) {
      console.error("Failed to enroll people in workflow:", error);
      res.status(500).json({ error: "Failed to enroll people in workflow" });
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

      // Get the event to return the registration page URL
      const event = await storage.getEventByApiId(event_api_id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      console.log("Returning event registration link (not sending Luma invite):", {
        eventId: event_api_id,
        userEmail: email,
        eventUrl: event.url,
      });

      // Return the event URL so the user can register/buy tickets on Luma directly
      // We no longer send Luma invites as that bypasses ticket purchases
      res.json({
        message: "Check out the event and register!",
        eventUrl: event.url,
        event: {
          title: event.title,
          startTime: event.startTime,
          url: event.url,
        },
      });
    } catch (error) {
      console.error("Failed to get event info:", error);
      res.status(500).json({
        error: "Failed to get event info",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/public/posts", async (req, res) => {
    try {
      const isLoggedIn = req.session.userId;
      console.log("Fetching public posts...");
      const posts = (await storage.getPosts()).map((post) => {
        console.log("Post fetched:", post.membersOnly);
        const hide = post.membersOnly && !isLoggedIn;
        return {
          ...post,
          body: hide ? "" : post.body,
          ctaLink: hide ? "" : post.ctaLink,
          ctaLabel: hide ? "" : post.ctaLabel,
          videoUrl: hide ? "" : post.videoUrl,
        };
      });
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
  
  app.get("/api/industries", async (_req, res) => {
    try {
      const result = await db
        .select({
          id: industries.id,
          name: industries.name,
          isActive: industries.isActive,
        })
        .from(industries)
        .where(eq(industries.isActive, true))
        .orderBy(industries.name);

      res.json({ industries: result });
    } catch (error) {
      console.error("Failed to fetch industries:", error);
      res.status(500).json({ error: "Failed to fetch industries" });
    }
  });
  
  app.post("/api/industries", async (req, res) => {
    try {
      // Require admin access
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Industry name is required" });
      }
      
      // Check if industry already exists
      const existingIndustry = await db
        .select()
        .from(industries)
        .where(sql`LOWER(name) = ${name.toLowerCase().trim()}`)
        .limit(1);
        
      if (existingIndustry.length > 0) {
        return res.status(409).json({ 
          error: "Industry already exists",
          industry: existingIndustry[0]
        });
      }
      
      // Create the new industry
      const [newIndustry] = await db
        .insert(industries)
        .values({
          name: name.trim(),
          isActive: true,
        })
        .returning();
        
      res.status(201).json({ industry: newIndustry });
    } catch (error) {
      console.error("Failed to create industry:", error);
      res.status(500).json({ error: "Failed to create industry" });
    }
  });
  
  // Get industries for a company by ID
  app.get("/api/companies/:id/industries", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      const companyIndustriesResult = await db.execute(sql`
        SELECT i.*
        FROM industries i
        JOIN company_industries ci ON i.id = ci.industry_id
        WHERE ci.company_id = ${companyId} AND i.is_active = true
        ORDER BY i.name ASC
      `);
      
      res.json({ industries: companyIndustriesResult.rows || [] });
    } catch (error) {
      console.error("Error fetching company industries:", error);
      res.status(500).json({ error: "Failed to fetch company industries" });
    }
  });
  
  // Helper function to check if a user is an admin
  async function checkUserIsAdmin(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return !!user?.isAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }
  
  // Admin get all industries endpoint
  app.get("/api/admin/industries", async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get all industries
      const allIndustries = await db
        .select()
        .from(industries)
        .orderBy(industries.name);
      
      console.log(`Fetched ${allIndustries.length} industries for admin`);
      
      res.json({ industries: allIndustries });
    } catch (error) {
      console.error("Error fetching industries for admin:", error);
      res.status(500).json({ error: "Failed to fetch industries" });
    }
  });
  
  // Admin create industry endpoint
  app.post("/api/admin/industries", async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Industry name is required" });
      }
      
      // Check if industry with same name already exists
      const existingIndustry = await db
        .select()
        .from(industries)
        .where(sql`LOWER(name) = ${name.toLowerCase()}`)
        .limit(1);
      
      if (existingIndustry.length > 0) {
        return res.status(409).json({ 
          error: "Industry with this name already exists",
          industry: existingIndustry[0] 
        });
      }
      
      // Insert new industry
      const now = new Date().toISOString();
      const newIndustry = await db.insert(industries).values({
        name,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }).returning();
      
      console.log("Created new industry:", newIndustry[0]);
      
      res.status(201).json({ industry: newIndustry[0] });
    } catch (error) {
      console.error("Error creating industry:", error);
      res.status(500).json({ error: "Failed to create industry" });
    }
  });

  // Update industries for a company
  app.post("/api/companies/:id/industries", authenticateUser, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const industryIds: number[] = req.body.industryIds || [];
      
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }
      
      // Check if user is authorized to update this company
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
        
      if (company.length === 0) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      // Check company membership
      const userMembership = await db
        .select()
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.companyId, companyId),
            eq(companyMembers.userId, req.session.userId!)
          )
        )
        .limit(1);
        
      const isAdmin = await checkUserIsAdmin(req.session.userId!);
      
      if (userMembership.length === 0 && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to update this company" });
      }
      
      // Delete all existing industry associations
      await db.execute(sql`
        DELETE FROM company_industries
        WHERE company_id = ${companyId}
      `);
      
      // Add new industry associations
      if (industryIds.length > 0) {
        const industryValues = industryIds.map(industryId => `(${companyId}, ${industryId}, NOW(), NOW())`).join(", ");
        
        await db.execute(sql`
          INSERT INTO company_industries (company_id, industry_id, created_at, updated_at)
          VALUES ${sql.raw(industryValues)}
        `);
      }
      
      // Get updated industries
      const updatedIndustries = await db.execute(sql`
        SELECT i.*
        FROM industries i
        JOIN company_industries ci ON i.id = ci.industry_id
        WHERE ci.company_id = ${companyId} AND i.is_active = true
        ORDER BY i.name ASC
      `);
      
      res.json({ industries: updatedIndustries.rows || [] });
    } catch (error) {
      console.error("Error updating company industries:", error);
      res.status(500).json({ error: "Failed to update company industries" });
    }
  });

  app.patch("/api/admin/industries/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const industryId = parseInt(req.params.id, 10);
      if (isNaN(industryId)) {
        return res.status(400).json({ error: "Invalid industry ID" });
      }
      
      const { name, isActive } = req.body;
      
      // Make sure at least one field is being updated
      if (name === undefined && isActive === undefined) {
        return res.status(400).json({ error: "No update fields provided" });
      }
      
      // Check if industry exists
      const existingIndustry = await db
        .select()
        .from(industries)
        .where(eq(industries.id, industryId))
        .limit(1);
      
      if (!existingIndustry.length) {
        return res.status(404).json({ error: "Industry not found" });
      }
      
      // Build update object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Update industry
      const [updatedIndustry] = await db.update(industries)
        .set(updateData)
        .where(eq(industries.id, industryId))
        .returning();
      
      res.json(updatedIndustry);
    } catch (error) {
      console.error("Failed to update industry:", error);
      res.status(500).json({ error: "Failed to update industry" });
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

      // Handle post tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        console.log("Adding tags to post:", req.body.tags);

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
            .values({ postId: createdPost.id, tagId: tag.id })
            .onConflictDoNothing();
        }
        console.log("Added post tags successfully");
      }

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
          membersOnly: posts.membersOnly,
          status: posts.status,
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
      const statusFilter = (req.query.status as string) || "all";
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];
      
      // Add search condition
      if (searchQuery) {
        conditions.push(sql`(
          LOWER(${users.email}) LIKE ${`%${searchQuery}%`} OR 
          LOWER(${users.displayName}) LIKE ${`%${searchQuery}%`} OR 
          LOWER(${people.userName}) LIKE ${`%${searchQuery}%`}
        )`);
      }
      
      // Add status filter condition
      if (statusFilter === "verified") {
        conditions.push(eq(users.isVerified, true));
      } else if (statusFilter === "pending") {
        conditions.push(eq(users.isVerified, false));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .leftJoin(people, eq(users.personId, people.id))
        .where(whereClause)
        .then((result) => Number(result[0].count));

      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          userName: people.userName,
          isVerified: users.isVerified,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          person: people,
          subscriptionStatus: users.subscriptionStatus,
          premiumSource: users.premiumSource,
          premiumExpiresAt: users.premiumExpiresAt,
          premiumGrantedBy: users.premiumGrantedBy,
          premiumGrantedAt: users.premiumGrantedAt,
          stripeCustomerId: users.stripeCustomerId,
          subscriptionId: users.subscriptionId,
        })
        .from(users)
        .leftJoin(people, eq(users.personId, people.id))
        .where(whereClause)
        .orderBy(users.createdAt)
        .limit(limit)
        .offset(offset);

      // Batch fetch all badges for these users in one query
      const userIds = usersList.map(u => u.id);
      
      if (userIds.length > 0) {
        const allBadges = await db
          .select({
            userId: userBadgesTable.userId,
            badgeId: badges.id,
            name: badges.name,
            description: badges.description,
            icon: badges.icon,
            isAutomatic: badges.isAutomatic,
            assignedAt: userBadgesTable.assignedAt,
          })
          .from(userBadgesTable)
          .innerJoin(badges, eq(badges.id, userBadgesTable.badgeId))
          .where(sql`${userBadgesTable.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

        // Group badges by user ID
        const badgesByUser = allBadges.reduce((acc, badge) => {
          if (!acc[badge.userId]) {
            acc[badge.userId] = [];
          }
          acc[badge.userId].push({
            id: badge.badgeId,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            isAutomatic: badge.isAutomatic,
            assignedAt: badge.assignedAt,
          });
          return acc;
        }, {} as Record<number, any[]>);

        // Attach badges to users
        const usersWithBadges = usersList.map(user => ({
          ...user,
          badges: badgesByUser[user.id] || [],
        }));

        res.json({
          users: usersWithBadges,
          total: totalCount,
        });
      } else {
        res.json({
          users: usersList,
          total: totalCount,
        });
      }
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
