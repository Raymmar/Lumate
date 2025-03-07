import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import unsplashRoutes from './routes/unsplash';
import stripeRoutes from './routes/stripe';

const app = express();

// Raw body handling for Stripe webhooks must come before ANY other middleware
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Set up session handling
const PostgresStore = connectPg(session);
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

(async () => {
  // First ensure database tables exist
  const { ensureTablesExist } = await import('./db');

  console.log('Ensuring database tables exist...');
  await ensureTablesExist();

  // Mount API routes before static file serving or Vite middleware
  app.use('/api/stripe', stripeRoutes);  // Stripe routes first to ensure webhook handling
  app.use('/api/unsplash', unsplashRoutes);

  // Register other routes
  await registerRoutes(app);

  // Then set up Vite in development or serve static files in production
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