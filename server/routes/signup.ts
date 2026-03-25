import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const signupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  requestedRole: z.enum(["staff", "technician", "student"]),
  requestedProperty: z.string().optional(),
});

export function registerSignupRoutes(app: Express) {
  const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many signup attempts. Please try again later." },
  });

  app.post("/api/signup", signupLimiter, async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }

      const data = parsed.data;

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      const existingPending = await storage.getPendingUserByUsername(data.username);
      if (existingPending) {
        return res.status(400).json({ message: "A signup request with this username is already pending" });
      }

      const existingEmail = await storage.getPendingUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "A signup request with this email is already pending" });
      }

      const allUsers = await storage.getAllUsers();
      const emailTaken = allUsers.find(u => u.email && u.email.toLowerCase() === data.email.toLowerCase());
      if (emailTaken) {
        return res.status(400).json({ message: "This email is already associated with an existing account" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const pendingUser = await storage.createPendingUser({
        username: data.username,
        password: hashedPassword,
        email: data.email,
        phoneNumber: data.phoneNumber || null,
        firstName: data.firstName,
        lastName: data.lastName,
        requestedRole: data.requestedRole,
        requestedProperty: data.requestedProperty || null,
        expiresAt,
      });

      try {
        const { notifySignupPending } = await import("../notifications");
        await notifySignupPending(pendingUser);
      } catch (emailErr) {
        console.error("[SIGNUP] Email notification failed:", emailErr);
      }

      res.status(201).json({ message: "Your access request has been submitted and is pending admin review." });
    } catch (error) {
      handleRouteError(res, error, "Failed to submit signup request");
    }
  });

  app.get("/api/pending-users", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      await storage.expireOldPendingUsers();
      const pendingUsers = await storage.getPendingUsers();
      const safeUsers = pendingUsers.map(({ password, ...rest }) => rest);
      res.json(safeUsers);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch pending users");
    }
  });

  app.get("/api/pending-users/count", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const count = await storage.getPendingUserCount();
      res.json({ count });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch pending user count");
    }
  });

  app.get("/api/pending-users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const pendingUser = await storage.getPendingUser(req.params.id);
      if (!pendingUser) {
        return res.status(404).json({ message: "Pending user not found" });
      }
      const { password, ...safe } = pendingUser;
      res.json(safe);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch pending user");
    }
  });

  app.patch("/api/pending-users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const pendingUser = await storage.getPendingUser(req.params.id);
      if (!pendingUser) {
        return res.status(404).json({ message: "Pending user not found" });
      }
      if (pendingUser.status !== "pending") {
        return res.status(400).json({ message: "Can only edit pending requests" });
      }

      const allowedFields = ["firstName", "lastName", "email", "phoneNumber", "requestedRole", "requestedProperty"];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      const validRoles = ["staff", "technician", "student"];
      if (updates.requestedRole) {
        if (!validRoles.includes(updates.requestedRole)) {
          return res.status(400).json({ message: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
        }
      }

      const updated = await storage.updatePendingUser(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Pending user not found" });
      }
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (error) {
      handleRouteError(res, error, "Failed to update pending user");
    }
  });

  app.post("/api/pending-users/:id/approve", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const pendingUser = await storage.getPendingUser(req.params.id);
      if (!pendingUser) {
        return res.status(404).json({ message: "Pending user not found" });
      }
      if (pendingUser.status !== "pending") {
        return res.status(400).json({ message: `This request has already been ${pendingUser.status}` });
      }

      const existingUser = await storage.getUserByUsername(pendingUser.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username has been taken since this request was submitted" });
      }

      const allUsers = await storage.getAllUsers();
      const emailTaken = allUsers.find(u => u.email && u.email.toLowerCase() === pendingUser.email.toLowerCase());
      if (emailTaken) {
        return res.status(400).json({ message: "This email is already associated with an existing account" });
      }

      const newUser = await storage.createUser({
        username: pendingUser.username,
        password: pendingUser.password,
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        role: pendingUser.requestedRole,
        phoneNumber: pendingUser.phoneNumber,
        property: pendingUser.requestedProperty,
      });

      await storage.updatePendingUser(req.params.id, {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: req.userId,
      });

      try {
        const { notifySignupDecision } = await import("../notifications");
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
        const loginUrl = `${protocol}://${host}/login`;
        await notifySignupDecision(pendingUser, "approved", undefined, loginUrl);
      } catch (emailErr) {
        console.error("[SIGNUP] Approval email failed:", emailErr);
      }

      res.json({ message: "User approved and account created", user: { id: newUser.id, username: newUser.username } });
    } catch (error) {
      handleRouteError(res, error, "Failed to approve user");
    }
  });

  app.post("/api/pending-users/:id/deny", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const pendingUser = await storage.getPendingUser(req.params.id);
      if (!pendingUser) {
        return res.status(404).json({ message: "Pending user not found" });
      }
      if (pendingUser.status !== "pending") {
        return res.status(400).json({ message: `This request has already been ${pendingUser.status}` });
      }

      const { reason } = req.body;

      await storage.updatePendingUser(req.params.id, {
        status: "denied",
        denialReason: reason || null,
        reviewedAt: new Date(),
        reviewedBy: req.userId,
      });

      try {
        const { notifySignupDecision } = await import("../notifications");
        await notifySignupDecision(pendingUser, "denied", reason);
      } catch (emailErr) {
        console.error("[SIGNUP] Denial email failed:", emailErr);
      }

      res.json({ message: "Signup request denied" });
    } catch (error) {
      handleRouteError(res, error, "Failed to deny user");
    }
  });

  app.delete("/api/pending-users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deletePendingUser(req.params.id);
      res.json({ message: "Pending user deleted" });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete pending user");
    }
  });
}
