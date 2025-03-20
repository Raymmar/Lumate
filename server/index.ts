import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import unsplashRoutes from "./routes/unsplash";
import stripeRoutes from "./routes/stripe";
import { badgeService } from "./services/BadgeService";
import { startEventSyncService } from "./services/eventSyncService";

const app = express();

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

// Regular body parsing for everything else
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session handling
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

(async () => {
  // First ensure database tables exist
  const { ensureTablesExist } = await import("./db");
  await ensureTablesExist();

  // Mount API routes - Stripe routes first to ensure webhook handling
  app.use("/api/stripe", stripeRoutes);
  app.use("/api/unsplash", unsplashRoutes);
  await registerRoutes(app);

  // Set up Vite or serve static files
  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server error:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal Server Error" });
  });

  // Schedule daily badge assignment
  // Run it immediately when the server starts
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

  startEventSyncService(true); // pass true if you want to sync future events immediately

  // Start server
  const port = 5000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
    console.log(
      `For local webhook testing, use: http://localhost:${port}/api/stripe/webhook`,
    );
  });
})();
