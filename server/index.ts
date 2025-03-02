import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startEventSyncService } from "./services/eventSyncService";
import { fileUploadService } from "./services/FileUploadService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // First ensure database tables exist
    const { ensureTablesExist } = await import('./db');

    console.log('Ensuring database tables exist...');
    await ensureTablesExist();

    // Initialize FileUploadService first to catch any initialization errors
    console.log('Initializing FileUploadService...');
    try {
      await fileUploadService;
      console.log('FileUploadService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FileUploadService:', error);
      process.exit(1); // Exit if we can't initialize file uploads
    }

    const server = await registerRoutes(app);

    // Initialize cache service to start syncing data in the background
    console.log('Starting CacheService in background...');
    setTimeout(async () => {
      try {
        const CacheService = (await import('./services/CacheService')).CacheService;
        const cacheService = CacheService.getInstance();
        console.log('CacheService started successfully in background');
      } catch (error) {
        console.error('Failed to initialize CacheService:', error);
      }
    }, 100); // Small delay to ensure server starts quickly

    // Start event sync service in background
    console.log('Starting EventSyncService in background...');
    setTimeout(() => {
      try {
        startEventSyncService();
        console.log('EventSyncService started successfully in background');
      } catch (error) {
        console.error('Failed to initialize EventSyncService:', error);
      }
    }, 200); // Small delay after CacheService

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Express error handler caught:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server running on port ${port}`);
      log('Environment variables check:');
      log(`- REPLIT_DEFAULT_BUCKET_ID: ${process.env.REPLIT_DEFAULT_BUCKET_ID ? 'Set' : 'Not set'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();