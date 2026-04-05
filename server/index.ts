import express, { type Request, Response, NextFunction } from "express";
import { log, setupVite, serveStatic } from "./vite";
import { setupAuth } from "./replitAuth";
import { registerRoutes } from "./routes";
import { applyMigrations } from "./applyMigrations";
import { db, pool } from "./db";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { seedDatabase } from "./seed";
import passport from "passport";
import { storage } from "./storage";
import { startRecurringTaskScheduler } from "./recurringTaskScheduler";
import { startDocumentExpirationScheduler } from "./documentExpirationScheduler";
import { startTaskReminderScheduler } from "./taskReminderScheduler";
import { startPendingUserExpirationScheduler } from "./pendingUserExpirationScheduler";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

const isProduction = process.env.NODE_ENV === "production";

// Trust proxy must be set before rate limiting so req.ip resolves correctly behind proxies
// Replit always runs behind a reverse proxy, even in development
app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});
app.use("/api", apiLimiter);

const PgSession = pgSession(session);
const store = new PgSession({
  pool,
  createTableIfMissing: true,
  tableName: 'sessions'
});

const sessionSecret = process.env.SESSION_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString("hex");
  console.warn("WARNING: SESSION_SECRET not set. Using a random secret. Sessions will not persist across restarts. Set SESSION_SECRET in your environment secrets.");
  return generated;
})();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    },
  })
);

// Configure passport for local authentication
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(passport.initialize());
app.use(passport.session());

// Setup authentication routes
setupAuth(app);

// Disable HTTP caching for API routes to ensure fresh data
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

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
  // Apply all database migrations
  await applyMigrations();

  try {
    const backfilled = await storage.backfillTaskPools();
    if (backfilled > 0) {
      console.log(`Backfilled ${backfilled} unassigned tasks into their respective pools`);
    }
  } catch (err) {
    console.error("Failed to backfill task pools:", err);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Only handle errors that haven't been handled by route handlers
    // Route handlers should call res.json() or res.status().json() themselves
    if (!res.headersSent) {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Unhandled error in global handler:", err);
      res.status(status).json({ message });
    }
    // Don't throw - let the route handler manage the response
  });

  // importantly only setup vite in development and after
  // setting up all the routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the recurring task scheduler
    startRecurringTaskScheduler();
    
    // Start the document expiration reminder scheduler
    startDocumentExpirationScheduler();
    
    // Start the task reminder scheduler
    startTaskReminderScheduler();
    
    // Start the pending user expiration scheduler
    startPendingUserExpirationScheduler();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log(`${signal} received, closing server gracefully...`);
    server.close(() => {
      log('Server closed');
    });

    try {
      await pool.end();
      log('Database connections closed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Prevent Object Storage WebSocket disconnects (ECONNRESET) from crashing the process
  process.on('uncaughtException', (err: any) => {
    if (err.code === 'ECONNRESET' || err.message?.includes('TLS') || err.message?.includes('socket')) {
      console.warn('[server] Suppressed network error (Object Storage reconnect):', err.message);
    } else {
      console.error('[server] Uncaught exception:', err);
    }
  });

  process.on('unhandledRejection', (reason: any) => {
    if (reason?.code === 'ECONNRESET' || reason?.message?.includes('TLS') || reason?.message?.includes('socket')) {
      console.warn('[server] Suppressed network rejection (Object Storage reconnect):', reason?.message);
    } else {
      console.error('[server] Unhandled rejection:', reason);
    }
  });
})();