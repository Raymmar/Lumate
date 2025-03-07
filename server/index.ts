import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import unsplashRoutes from './routes/unsplash';
import stripeRoutes from './routes/stripe';

const app = express();

// Raw body handling for Stripe webhooks
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), (req, res, next) => {
  console.log('🔄 Stripe webhook request received:', {
    path: req.path,
    method: req.method,
    contentType: req.headers['content-type'],
    hasSignature: !!req.headers['stripe-signature'],
    bodyLength: req.body?.length || 0
  });
  next();
});

// Regular body parsing for everything else
app.use(express.json());
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
  await ensureTablesExist();

  // Mount API routes - Stripe routes first to ensure webhook handling
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/unsplash', unsplashRoutes);
  await registerRoutes(app);

  // Set up Vite or serve static files
  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  });

  // Start server
  const port = 5000;
  app.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`Server running on port ${port}`);
  });
})();