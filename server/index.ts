import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import unsplashRoutes from "./routes/unsplash";
import stripeRoutes from "./routes/stripe";
import { badgeService } from "./services/BadgeService";
import { startEventSyncService } from "./services/eventSyncService";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { profileMetaTags } from "./middleware/seoTags";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Raw body handling for Stripe webhooks must come first
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    console.log("🔔 Webhook Request Details:", {
      contentType: req.headers["content-type"],
      hasSignature: !!req.headers["stripe-signature"],
      bodyLength: req.body?.length || 0,
    });
    next();
  },
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

  // Mount API routes
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/unsplash", unsplashRoutes);
  await registerRoutes(app);
  
  // Apply SEO meta tag middleware for profile pages
  app.use('/', profileMetaTags);

  // Set up Vite or serve static files
  if (process.env.NODE_ENV === "development") {
    console.log("[Server] Setting up Vite development server");
    await setupVite(app);
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
      res.sendFile(path.resolve(staticDir, "index.html"));
    });
  }

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  });

  // Schedule daily badge assignment
  try {
    console.log("Running initial badge assignment...");
    await badgeService.runDailyBadgeAssignment();
    console.log("Initial badge assignment completed");
  } catch (error) {
    console.error("Failed to run initial badge assignment:", error);
  }

  // Then schedule it to run every 24 hours
  setInterval(
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

  startEventSyncService(false); // pass true if you want to sync future events immediately

  // Start server with improved logging
  const port = parseInt(process.env.PORT || "5000");
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Server] Listening on port ${port} bound to 0.0.0.0`);
    if (isProduction) {
      console.log(`[Server] Production webhook endpoint: ${process.env.APP_URL}/api/stripe/webhook`);
    } else {
      console.log(`[Server] Development webhook endpoint: http://localhost:${port}/api/stripe/webhook`);
    }
  });

  // Add error handling for the server
  server.on('error', (error: any) => {
    console.error('[Server] Error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use`);
    }
  });
})();