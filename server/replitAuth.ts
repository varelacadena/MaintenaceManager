import type { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import session from "express-session";
import PostgresSessionStore from "connect-pg-simple";
import { pool } from "./db";

export async function setupAuth(app: Express) {
  const isProduction = process.env.REPL_DEPLOYMENT === "1";

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "replit-maintenance-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new PostgresSessionStore(pool),
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: isProduction, // Use secure cookies in production
        sameSite: isProduction ? "none" : "lax", // Allow cross-site in production
      },
      proxy: isProduction, // Trust proxy in production
    })
  );

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user ID in session
      (req.session as any).userId = user.id;

      res.json({ success: true });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request
    (req as any).userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};