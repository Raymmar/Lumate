import express, { type Request, Response, NextFunction } from "express";
import * as http from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import unsplashRoutes from "./routes/unsplash";
import stripeRoutes from "./routes/stripe";
import { badgeService } from "./services/BadgeService";
import { startEventSyncService } from "./services/eventSyncService";
import { emailInvitationService } from "./services/EmailInvitationService";
import { pool } from "./db";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { isCrawler, isSupportedPage, isPostPage, isCompanyPage, isUserPage, isEventPage, isSummitPage, extractPostSlug, extractCompanySlug, extractUsername, extractEventSlug } from "./utils/crawlerDetection";
import { fetchPostForOpenGraph, fetchCompanyForOpenGraph, fetchUserForOpenGraph, fetchEventForOpenGraph, fetchSummitForOpenGraph, injectOpenGraphTags } from "./utils/openGraphInjection";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Initialize storage for SSE connections
app.set('activeSSEConnections', []);

// Raw body handling for Stripe webhooks with UUID must come first
app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    console.log("🔔 Webhook received:", {
      contentType: req.headers["content-type"],
      hasSignature: !!signature,
      bodyLength: req.body?.length || 0,
      uuid: req.params.uuid,
    });

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        const errorMsg = 'STRIPE WEBHOOK ERROR: req.body is not a Buffer. ' +
          'This means express.json() ran before this webhook route. ' +
          'FIX: Move this webhook route registration BEFORE app.use(express.json()) in your code.';
        console.error(errorMsg);
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);

      if (error.message && error.message.includes('payload must be provided as a string or a Buffer')) {
        const helpfulMsg = 'STRIPE WEBHOOK ERROR: Payload is not a Buffer. ' +
          'This usually means express.json() parsed the body before the webhook handler. ' +
          'FIX: Ensure the webhook route is registered BEFORE app.use(express.json()).';
        console.error(helpfulMsg);
      }

      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Add health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Regular body parsing for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session handling
const PostgresStore = connectPg(session);

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

(async () => {
  // Log startup configuration
  console.log("[Server] Starting with configuration:", {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || "5000",
    dirname: __dirname,
    isProduction,
    publicPath: isProduction ? path.resolve(__dirname, "../dist/public") : path.resolve(__dirname, "public"),
  });

  // First ensure database tables exist
  const { ensureTablesExist } = await import("./db");
  await ensureTablesExist();

  // Initialize Stripe schema and sync
  async function initStripe() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.warn('DATABASE_URL not found, skipping Stripe initialization');
      return;
    }

    try {
      console.log('[Stripe] Initializing Stripe schema...');
      await runMigrations({ 
        databaseUrl
      });
      console.log('[Stripe] Stripe schema ready');

      const stripeSync = await getStripeSync();

      console.log('[Stripe] Setting up managed webhook...');
      const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`,
        {
          enabled_events: ['*'],
          description: 'Managed webhook for Stripe sync',
        }
      );
      console.log(`[Stripe] Webhook configured: ${webhook.url} (UUID: ${uuid})`);

      console.log('[Stripe] Starting background sync of Stripe data...');
      stripeSync.syncBackfill()
        .then(() => {
          console.log('[Stripe] Stripe data synced successfully');
        })
        .catch((err: any) => {
          console.error('[Stripe] Error syncing Stripe data:', err);
        });
    } catch (error) {
      console.error('[Stripe] Failed to initialize Stripe:', error);
    }
  }

  await initStripe();

  // Open Graph middleware for crawlers - must come before Vite/static setup
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'];
    const url = req.originalUrl;
    
    // Only handle crawler requests to supported pages (posts, companies, users)
    if (isCrawler(userAgent) && isSupportedPage(url)) {
      try {
        let ogData = null;
        
        if (isPostPage(url)) {
          const slug = extractPostSlug(url);
          if (slug) {
            ogData = await fetchPostForOpenGraph(slug);
          }
        } else if (isCompanyPage(url)) {
          const slug = extractCompanySlug(url);
          if (slug) {
            ogData = await fetchCompanyForOpenGraph(slug);
          }
        } else if (isUserPage(url)) {
          const username = extractUsername(url);
          if (username) {
            ogData = await fetchUserForOpenGraph(username);
          }
        } else if (isEventPage(url)) {
          const slug = extractEventSlug(url);
          if (slug) {
            ogData = await fetchEventForOpenGraph(slug);
          }
        } else if (isSummitPage(url)) {
          ogData = fetchSummitForOpenGraph();
        }
        
        if (ogData) {
          // Determine the correct HTML template path
          const templatePath = isProduction
            ? path.resolve(__dirname, "../dist/public/index.html")
            : path.resolve(__dirname, "..", "client", "index.html");
          
          // Read and modify the HTML template
          let template = await fs.promises.readFile(templatePath, "utf-8");
          const modifiedHtml = injectOpenGraphTags(template, ogData);
          
          console.log(`[OpenGraph] Serving enhanced HTML for crawler: ${userAgent?.substring(0, 50)} to ${url}`);
          return res.status(200).set({ "Content-Type": "text/html" }).end(modifiedHtml);
        }
      } catch (error) {
        console.error('[OpenGraph] Error processing crawler request:', error);
        // Fall through to normal handling
      }
    }
    
    next();
  });

  // Mount API routes
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/unsplash", unsplashRoutes);
  
  // Import and mount premium routes
  const { default: premiumRoutes } = await import("./routes/premium");
  app.use(premiumRoutes);
  
  await registerRoutes(app);

  // Create the server
  const server = http.createServer(app);

  // Set up Vite or serve static files
  if (process.env.NODE_ENV === "development") {
    console.log("[Server] Setting up Vite development server");
    await setupVite(app, server);
  } else {
    const staticDir = path.resolve(__dirname, "../dist/public");
    console.log("[Server] Setting up static file serving from:", staticDir);

    // Check if the directory exists
    if (!fs.existsSync(staticDir)) {
      console.error(`[Server] Static directory not found: ${staticDir}`);
      throw new Error(`Could not find the build directory: ${staticDir}, make sure to build the client first`);
    }

    app.use(express.static(staticDir));

    // For routes that don't match a file, send index.html
    app.use("*", (_req, res) => {
      console.log("[Server] Serving index.html for unknown route");
      res.sendFile(path.resolve(staticDir, "index.html"), (err) =>{
        if (err){
          console.error("Error serving index.html:", err);
        }
      });
    });
  }

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  });

  // Store interval IDs for cleanup
  let badgeAssignmentInterval: NodeJS.Timeout | null = null;
  let eventSyncIntervals: { recentSyncInterval: NodeJS.Timeout, futureSyncInterval: NodeJS.Timeout } | null = null;

  // Schedule daily badge assignment (run async after server starts)
  setTimeout(async () => {
    try {
      console.log("Running initial badge assignment...");
      await badgeService.runDailyBadgeAssignment();
      console.log("Initial badge assignment completed");
    } catch (error) {
      console.error("Failed to run initial badge assignment:", error);
    }
  }, 2000); // Delay 2 seconds to let server start first

  // Then schedule it to run every 24 hours
  badgeAssignmentInterval = setInterval(
    async () => {
      try {
        console.log("Running scheduled badge assignment...");
        await badgeService.runDailyBadgeAssignment();
        console.log("Scheduled badge assignment completed");
      } catch (error) {
        console.error("Failed to run scheduled badge assignment:", error);
      }
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours in milliseconds

  // Start server with improved logging and port checking
  const port = parseInt(process.env.PORT || "5000");
  
  // Note: Port availability check removed for faster startup in Replit environment

  server.listen(port, "0.0.0.0", async () => {
    console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Server] Listening on port ${port} bound to 0.0.0.0`);
    if (isProduction) {
      console.log(`[Server] Production webhook endpoint: ${process.env.APP_URL}/api/stripe/webhook`);
    } else {
      console.log(`[Server] Development webhook endpoint: http://localhost:${port}/api/stripe/webhook`);
    }

    // Start background services after server is listening
    try {
      eventSyncIntervals = await startEventSyncService(false);
      
      // Start email invitation service (for claim detection and follow-ups only)
      emailInvitationService.start();
      
      console.log('[Server] Background services initialized');
    } catch (error) {
      console.error('[Server] Error starting background services:', error);
    }
  });

  // Add error handling for the server
  server.on('error', (error: any) => {
    console.error('[Server] Error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use`);
      console.error('[Server] Try stopping the existing process or waiting a few seconds before restarting');
      process.exit(1);
    }
  });

  // Graceful shutdown handling
  let shutdownCalled = false;
  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}, starting graceful shutdown...`);
    
    // Prevent multiple shutdown attempts
    if (shutdownCalled) {
      console.log('[Server] Shutdown already in progress, force exiting...');
      process.exit(1);
    }
    shutdownCalled = true;
    
    // Clear intervals immediately
    if (badgeAssignmentInterval) {
      clearInterval(badgeAssignmentInterval);
      console.log('[Server] Cleared badge assignment interval');
    }

    if (eventSyncIntervals) {
      clearInterval(eventSyncIntervals.recentSyncInterval);
      clearInterval(eventSyncIntervals.futureSyncInterval);
      console.log('[Server] Cleared event sync intervals');
    }
    
    // Stop email invitation service
    emailInvitationService.stop();
    console.log('[Server] Stopped email invitation service');

    // Close SSE connections
    const activeConnections = app.get('activeSSEConnections') || [];
    activeConnections.forEach((res: any) => {
      try {
        if (!res.headersSent) {
          res.end();
        }
      } catch (err) {
        // Ignore errors when closing connections
      }
    });
    console.log(`[Server] Closed ${activeConnections.length} SSE connections`);

    // Close the server first
    server.close(() => {
      console.log('[Server] HTTP server closed');
      
      // Then close database pool
      pool.end().then(() => {
        console.log('[Server] Database connection pool closed');
        console.log('[Server] Graceful shutdown complete');
        process.exit(0);
      }).catch((err) => {
        console.error('[Server] Error closing database pool:', err);
        process.exit(1);
      });
    });

    // Force exit after 5 seconds (reduced timeout)
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  // Register signal handlers with immediate cleanup
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
})();