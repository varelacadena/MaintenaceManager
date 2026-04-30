import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { handleRouteError } from "../routeUtils";

export function registerAuthRoutes(app: Express) {
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ status: "error", timestamp: new Date().toISOString(), message: "Database connection failed" });
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again in 15 minutes." },
    skipSuccessfulRequests: true,
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    try {
      const allUsers = await storage.getAllUsers();

      if (allUsers.length === 0) {
        console.log("First-time setup detected - creating initial admin account");

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await storage.createUser({
          username,
          password: hashedPassword,
          email: "",
          firstName: "Admin",
          lastName: "User",
          role: "admin",
        });

        console.log(`✅ First admin account created: ${username}`);

        (req.session as any).userId = newAdmin.id;
        req.session.save(() => {
          res.json({ 
            success: true, 
            firstTimeSetup: true,
            user: {
              id: newAdmin.id,
              username: newAdmin.username,
              email: newAdmin.email,
              firstName: newAdmin.firstName,
              lastName: newAdmin.lastName,
              role: newAdmin.role,
            }
          });
        });
        return;
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }

      if (!user) {
        const allPending = await storage.getPendingUsers();
        const matchingPending = allPending.find(p => p.username === username || p.email === username);
        if (matchingPending && matchingPending.status === "pending") {
          return res.status(403).json({ message: "Your account request is still pending admin review. You'll receive an email when it's been processed." });
        }
        if (matchingPending && matchingPending.status === "denied") {
          return res.status(403).json({ message: "Your account request was not approved. Please contact an administrator for more information." });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      req.session.save(() => {
        res.json({ success: true, user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }});
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", isAuthenticated, (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  const passwordRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/auth/forgot-password", passwordRecoveryLimiter, async (req, res) => {
    const { username } = req.body;
    const genericResponse = { message: "If an account with that username or email exists and has an email address, a recovery email has been sent." };

    if (!username || typeof username !== "string") {
      return res.json(genericResponse);
    }

    try {
      const trimmed = username.trim();
      let user = await storage.getUserByUsername(trimmed);
      if (!user) {
        user = await storage.getUserByEmail(trimmed);
      }
      if (!user || !user.email) {
        return res.json(genericResponse);
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createResetToken(user.id, token, expiresAt);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

      try {
        const { Resend } = await import("resend");
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) throw new Error("Resend API key env var is not set");
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        const displayName = user.firstName ? user.firstName : user.username;

        const { error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Password Reset Request – Hartland Maintenance",
          html: `
            <p>Hello ${displayName},</p>
            <p>We received a request to reset your password for the Hartland Maintenance system.</p>
            <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset My Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
            <p>— Hartland Maintenance System</p>
          `,
        });
        if (sendError) {
          throw new Error(`Resend API error: ${sendError.message}`);
        }
      } catch (emailError) {
        console.error("[PASSWORD RESET] Failed to send email:", emailError);
      }

      return res.json(genericResponse);
    } catch (error) {
      console.error("[PASSWORD RESET] forgot-password error:", error);
      return res.json(genericResponse);
    }
  });

  app.post("/api/auth/reset-password", passwordRecoveryLimiter, async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || typeof token !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    try {
      const resetToken = await storage.getResetTokenByToken(token.trim());

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used. Please request a new one." });
      }

      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.markResetTokenUsed(token.trim());

      return res.json({ message: "Your password has been reset successfully. You can now log in." });
    } catch (error) {
      console.error("[PASSWORD RESET] reset-password error:", error);
      return res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch user");
    }
  });
}
