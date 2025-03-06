import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import unsplashRoutes from './routes/unsplash';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session handling
const PostgresStore = connectPg(session);
const isProduction = process.env.NODE_ENV === 'production';

// Enhanced session configuration
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

// Add detailed authentication logging middleware
app.use((req, res, next) => {
  console.log('Auth Debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    path: req.path,
    method: req.method,
    authenticated: !!req.session?.userId,
    cookies: req.headers.cookie,
    timestamp: new Date().toISOString()
  });
  next();
});

// Mount Unsplash routes
app.use('/api/unsplash', unsplashRoutes);

// Request logging middleware with timing
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
  // First ensure database tables exist
  const { ensureTablesExist } = await import('./db');

  console.log('Ensuring database tables exist...');
  await ensureTablesExist();

  // Register routes first
  await registerRoutes(app);

  // Then set up Vite in development
  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // Start server
  const port = 5000;
  app.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();