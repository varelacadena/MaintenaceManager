import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, getCurrentUser, requireAdmin, requireTechnicianOrAdmin, requireStaffOrHigher, requireRequestAccess, requireTaskExecutorOrAdmin, requireTaskAccess, canAccessTask } from "./middleware";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

import { seedDatabase } from "./seed";
import { notificationService, notifyTaskCreated, notifyStatusChange, notifyTaskAssigned, notifyNewServiceRequest, notifyNewVehicleReservation, notifyVehicleReservationApproved, notifyVehicleReservationDenied } from "./notifications";
import {
  partsUsed,
  insertServiceRequestSchema,
  insertTaskSchema,
  insertPartUsedSchema,
  insertMessageSchema,
  insertUploadSchema,
  insertTaskNoteSchema,
  insertTaskChecklistSchema,
  insertChecklistTemplateSchema,
  insertAreaSchema,
  insertSubdivisionSchema,
  insertVendorSchema,
  insertInventoryItemSchema,
  insertPropertySchema,
  insertResourceSchema,
  insertSpaceSchema,
  insertEquipmentSchema,
  insertVehicleSchema,
  insertVehicleReservationSchema,
  insertVehicleCheckOutLogSchema,
  insertVehicleCheckInLogSchema,
  insertVehicleMaintenanceScheduleSchema,
  insertVehicleMaintenanceLogSchema,
  insertVehicleDocumentSchema,
  insertEmergencyContactSchema,
  insertNotificationSchema,
  insertProjectSchema,
  insertProjectTeamMemberSchema,
  insertProjectVendorSchema,
  insertQuoteSchema,
  insertAvailabilityScheduleSchema,
  insertUserSkillSchema,
  insertTaskDependencySchema,
  insertSlaConfigSchema,
  insertLockboxSchema,
  insertLockboxCodeSchema,
} from "@shared/schema";
import { z } from "zod";

// Helper function to get authenticated user
async function getAuthUser(req: any) {
  // Use req.userId which is set by isAuthenticated middleware
  const userId = req.userId || (req.session as any)?.userId;
  if (!userId) {
    return null;
  }
  try {
    const user = await storage.getUser(userId);
    return user;
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return null;
  }
}

// Helper function to automatically sync vehicle status based on current state
async function syncVehicleStatus(vehicleId: string): Promise<void> {
  try {
    const vehicle = await storage.getVehicle(vehicleId);
    if (!vehicle) return;

    // Don't change maintenance/cleaning statuses automatically - those are manually set
    if (vehicle.status === "needs_maintenance" || vehicle.status === "needs_cleaning" || vehicle.status === "out_of_service") {
      return;
    }

    // Check for active check-out logs without check-ins (vehicle is in use)
    const checkOutLogs = await storage.getVehicleCheckOutLogs({ vehicleId });
    const checkInLogs = await storage.getVehicleCheckInLogs({ vehicleId });
    
    const activeCheckOut = checkOutLogs.find(checkOut => {
      const hasMatchingCheckIn = checkInLogs.some(checkIn => checkIn.checkOutLogId === checkOut.id);
      return !hasMatchingCheckIn;
    });

    if (activeCheckOut) {
      // Vehicle is currently checked out - set to in_use
      if (vehicle.status !== "in_use") {
        await storage.updateVehicleStatus(vehicleId, "in_use");
      }
      return;
    }

    // Check for active reservations (pending or approved)
    const reservations = await storage.getVehicleReservations({ vehicleId });
    const hasActiveReservations = reservations.some(
      r => r.status === "pending" || r.status === "approved"
    );

    if (hasActiveReservations) {
      // Vehicle has active reservations - set to reserved
      if (vehicle.status !== "reserved") {
        await storage.updateVehicleStatus(vehicleId, "reserved");
      }
    } else {
      // No active reservations or checkouts - set to available
      if (vehicle.status !== "available") {
        await storage.updateVehicleStatus(vehicleId, "available");
      }
    }
  } catch (error) {
    console.error(`Error syncing vehicle status for ${vehicleId}:`, error);
  }
}

async function syncProjectStatusFromTasks(projectId: string): Promise<void> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return;
    if (project.status === "cancelled") return;

    const tasks = await storage.getTasksByProject(projectId);
    if (tasks.length === 0) {
      if (project.status !== "planning") {
        await storage.updateProject(projectId, { status: "planning" });
      }
      return;
    }

    const allCompleted = tasks.every(t => t.status === "completed");
    const someInProgressOrCompleted = tasks.some(
      t => t.status === "in_progress" || t.status === "completed"
    );

    let newStatus: string | null = null;

    if (allCompleted) {
      newStatus = "completed";
    } else if (someInProgressOrCompleted) {
      if (project.status !== "on_hold") {
        newStatus = "in_progress";
      }
    } else {
      if (project.status !== "on_hold") {
        newStatus = "planning";
      }
    }

    if (newStatus && newStatus !== project.status) {
      await storage.updateProject(projectId, { status: newStatus as any });
    }
  } catch (error) {
    console.error(`Error syncing project status for ${projectId}:`, error);
  }
}

// Placeholder for authenticateUser function (assuming it exists elsewhere)
async function authenticateUser(req: any): Promise<any | null> {
  // Use req.userId which is set by isAuthenticated middleware, or fall back to session
  const userId = req.userId || (req.session as any)?.userId;
  if (!userId) {
    return null;
  }
  try {
    const user = await storage.getUser(userId);
    if (user) {
      return { ...user, role: user.role }; // Ensure role is included
    }
  } catch (error) {
    console.error("Error during authenticateUser:", error);
  }
  return null;
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed database with default areas
  await seedDatabase();

  // Health check endpoint (no auth required)
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

  // Login endpoint
  app.post("/api/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    try {
      // Check if this is first-time setup (no users exist)
      const allUsers = await storage.getAllUsers();

      if (allUsers.length === 0) {
        console.log("First-time setup detected - creating initial admin account");

        // Create the first admin account with provided credentials
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

        // Log them in immediately
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

      // Normal login flow
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set user in session
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

  // Logout endpoint
  app.post("/api/logout", isAuthenticated, (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // ─── Password recovery endpoints ──────────────────────────────────────────

  const passwordRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/auth/forgot-password", passwordRecoveryLimiter, async (req, res) => {
    const { username } = req.body;
    const genericResponse = { message: "If an account with that username exists and has an email address, a recovery email has been sent." };

    if (!username || typeof username !== "string") {
      return res.json(genericResponse);
    }

    try {
      const user = await storage.getUserByUsername(username.trim());
      if (!user || !user.email) {
        return res.json(genericResponse);
      }

      // Generate a secure random token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.createResetToken(user.id, token, expiresAt);

      // Determine the app base URL
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

      // Send email via Resend
      try {
        const { Resend } = await import("resend");
        const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
        if (!hostname) throw new Error("REPLIT_CONNECTORS_HOSTNAME not set");
        const xReplitToken = process.env.REPL_IDENTITY
          ? "repl " + process.env.REPL_IDENTITY
          : process.env.WEB_REPL_RENEWAL
          ? "depl " + process.env.WEB_REPL_RENEWAL
          : null;
        if (!xReplitToken) throw new Error("Replit identity token not found");
        const connectionSettings = await fetch(
          "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
          { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
        ).then((r) => r.json()).then((d) => d.items?.[0]);
        if (!connectionSettings?.settings?.api_key) throw new Error("Resend not configured");

        const resend = new Resend(connectionSettings.settings.api_key);
        const fromEmail = connectionSettings.settings.from_email || "onboarding@resend.dev";
        const displayName = user.firstName ? user.firstName : user.username;

        await resend.emails.send({
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

        console.log(`[PASSWORD RESET] Email sent to ${user.email} for user ${user.username}`);
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

      console.log(`[PASSWORD RESET] Password successfully reset for userId ${resetToken.userId}`);
      return res.json({ message: "Your password has been reset successfully. You can now log in." });
    } catch (error) {
      console.error("[PASSWORD RESET] reset-password error:", error);
      return res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // User management routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      const users = await storage.getAllUsers();

      // Remove passwords from response
      let usersWithoutPasswords = users.map(({ password, ...user }) => user);

      // Maintenance and admin see all users (maintenance needs to see requesters for service requests)
      // Staff should not access this endpoint at all
      if (currentUser?.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      // Filter by role if specified
      const roleFilter = req.query.role as string | undefined;
      if (roleFilter && ["admin", "technician", "staff", "student"].includes(roleFilter)) {
        usersWithoutPasswords = usersWithoutPasswords.filter(u => u.role === roleFilter);
      }

      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const roleSchema = z.object({
        role: z.enum(["admin", "technician", "staff", "student"]),
      });
      const { role } = roleSchema.parse(req.body);

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid role", errors: error.errors });
      }
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userUpdateSchema = z.object({
        username: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      });
      const validated = userUpdateSchema.parse(req.body);

      const user = await storage.updateUser(id, validated);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error updating user:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      if (userToDelete.id === req.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      if (error.code === "23503") {
        return res.status(400).json({ message: "Cannot delete user with associated data. Remove their tasks and assignments first." });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Credential management routes (admin only)
  app.post("/api/credentials/create", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { username, password, email, phoneNumber, firstName, lastName, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }

      // Validate role value
      if (!["admin", "technician", "staff", "student"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phoneNumber,
        firstName,
        lastName,
        role,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        res.status(400).json({ message: "Username already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.patch("/api/credentials/:id/password", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const passwordSchema = z.object({
        password: z.string().min(1, "Password is required"),
      });
      const { password } = passwordSchema.parse(req.body);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.updateUserPassword(id, hashedPassword);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid password data", errors: error.errors });
      }
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.delete("/api/credentials/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);

      // Check if it's a foreign key constraint violation
      if (error.code === '23503') {
        return res.status(409).json({
          message: "Cannot delete user because they have associated data (service requests, messages, or time entries). You can change their role or password instead."
        });
      }

      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User profile management (self-service for all authenticated users)
  app.patch("/api/users/:id/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const targetId = req.params.id;

      // Users can only update their own profile unless they're admin
      if (userId !== targetId && req.user?.role !== "admin") {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const profileUpdateSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
      });
      const validated = profileUpdateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(targetId, validated);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many password change attempts. Please try again in 15 minutes." },
  });

  // Change password (self-service for all authenticated users)
  app.post("/api/users/change-password", isAuthenticated, passwordChangeLimiter, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, vendorData);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  // Barcode lookup — must come BEFORE /api/inventory/:id to avoid "barcode" matching as an id
  app.get("/api/inventory/by-barcode/:barcode", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItemByBarcode(req.params.barcode);
      if (!item) {
        return res.status(404).json({ message: "No inventory item found with that barcode" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item by barcode:", error);
      res.status(500).json({ message: "Failed to fetch inventory item by barcode" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.patch("/api/inventory/:id/quantity", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quantitySchema = z.object({ change: z.number() });
      const { change } = quantitySchema.parse(req.body);
      const item = await storage.updateInventoryQuantity(req.params.id, change);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory quantity:", error);
      res.status(500).json({ message: "Failed to update inventory quantity" });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Update stock status (for status-only mode items)
  app.patch("/api/inventory/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const stockStatusSchema = z.object({ stockStatus: z.enum(["stocked", "low", "out"]) });
      const { stockStatus } = stockStatusSchema.parse(req.body);
      const item = await storage.updateInventoryStatus(req.params.id, stockStatus);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory status:", error);
      res.status(500).json({ message: "Failed to update inventory status" });
    }
  });

  // Use one container (for container-mode items)
  app.post("/api/inventory/:id/use-container", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.useOneContainer(req.params.id);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error using container:", error);
      res.status(500).json({ message: "Failed to update container count" });
    }
  });

  // AI inventory insights
  app.post("/api/inventory/ai-insights", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { type, taskDescription, taskCategory } = req.body;
      if (!["reorder", "task_parts", "summary"].includes(type)) {
        return res.status(400).json({ message: "Invalid type. Must be: reorder, task_parts, or summary" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const allItems = await storage.getInventoryItems();
      const allParts = await storage.getPartsByTask ? [] : [];

      const itemsSummary = allItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || "general",
        trackingMode: item.trackingMode || "counted",
        quantity: parseFloat(item.quantity || "0"),
        unit: item.unit || "units",
        minQuantity: parseFloat(item.minQuantity || "0"),
        packageInfo: item.packageInfo || null,
        stockStatus: item.stockStatus || "stocked",
        cost: item.cost ? parseFloat(item.cost) : null,
      }));

      let prompt = "";
      let responseFormat = "json";

      if (type === "reorder") {
        prompt = `You are an inventory manager for a college facility maintenance department.
Here is the current inventory (JSON):
${JSON.stringify(itemsSummary, null, 2)}

Analyze the stock levels. For each item that should be reordered (quantity at or below minQuantity, or stockStatus is 'low' or 'out', or running critically low), provide a reorder recommendation.

Respond ONLY with a valid JSON array like this:
[
  {
    "id": "item-uuid",
    "name": "Item Name",
    "currentQuantity": 2,
    "unit": "bottles",
    "suggestedReorderQuantity": 10,
    "reason": "Plain English reason for reorder",
    "urgency": "high" | "medium" | "low"
  }
]

Return an empty array [] if nothing needs reordering. Respond only with JSON, no markdown.`;
      } else if (type === "task_parts") {
        prompt = `You are an inventory assistant for a college facility maintenance team.
Here is the available inventory:
${JSON.stringify(itemsSummary, null, 2)}

A technician needs to complete this task:
- Description: ${taskDescription || "General maintenance task"}
- Category: ${taskCategory || "general"}

Based on the task and available inventory, suggest which items they are likely to need. Only suggest items that exist in the inventory list above.

Respond ONLY with a valid JSON array like this:
[
  {
    "id": "item-uuid",
    "name": "Item Name",
    "suggestedQuantity": 2,
    "unit": "bottles",
    "reason": "Brief reason why this item is needed"
  }
]

Return an empty array [] if no specific items are needed. Respond only with JSON, no markdown.`;
      } else if (type === "summary") {
        prompt = `You are an inventory analyst for a college facility maintenance department.
Here is the current inventory data:
${JSON.stringify(itemsSummary, null, 2)}

Write a brief (2-4 sentences) plain-English summary of:
1. Overall inventory health
2. Which categories are well-stocked vs. running low
3. Any items that need immediate attention

Be concise and practical. Do not use markdown formatting.`;
        responseFormat = "text";
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content ?? "";

      if (responseFormat === "text") {
        return res.json({ type, summary: content });
      }

      // Parse JSON response
      let parsed;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch {
        parsed = [];
      }

      res.json({ type, items: parsed });
    } catch (error: any) {
      console.error("Error generating AI inventory insights:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI insights" });
    }
  });

  // Area routes
  app.get("/api/areas", isAuthenticated, async (req, res) => {
    try {
      const areas = await storage.getAreas();
      res.json(areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ message: "Failed to fetch areas" });
    }
  });

  app.post("/api/areas", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const areaData = insertAreaSchema.parse(req.body);
      const area = await storage.createArea(areaData);
      res.json(area);
    } catch (error) {
      console.error("Error creating area:", error);
      res.status(500).json({ message: "Failed to create area" });
    }
  });

  app.delete("/api/areas/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteArea(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting area:", error);
      res.status(500).json({ message: "Failed to delete area" });
    }
  });

  // Subdivision routes
  app.get("/api/subdivisions/:areaId", isAuthenticated, async (req, res) => {
    try {
      const subdivisions = await storage.getSubdivisionsByArea(
        req.params.areaId
      );
      res.json(subdivisions);
    } catch (error) {
      console.error("Error fetching subdivisions:", error);
      res.status(500).json({ message: "Failed to fetch subdivisions" });
    }
  });

  app.post("/api/subdivisions", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const subdivisionData = insertSubdivisionSchema.parse(req.body);
      const subdivision = await storage.createSubdivision(subdivisionData);
      res.json(subdivision);
    } catch (error) {
      console.error("Error creating subdivision:", error);
      res.status(500).json({ message: "Failed to create subdivision" });
    }
  });

  // Service request routes
  app.get("/api/service-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      let filters: any = {};

      // Role-based filtering
      if (currentUser?.role === "staff" || currentUser?.role === "technician" || currentUser?.role === "student") {
        filters.userId = userId; // Only see own requests
      }
      // Admin sees all requests

      // Optional status filter
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const requests = await storage.getServiceRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });

  app.get(
    "/api/service-requests/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const currentUser = await storage.getUser(userId);
        const request = await storage.getServiceRequest(req.params.id);

        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        // Non-admin roles can only view their own requests
        if (["staff", "technician", "student"].includes(currentUser?.role ?? "") && request.requesterId !== userId) {
          return res.status(403).json({ message: "Forbidden: Cannot view this request" });
        }

        res.json(request);
      } catch (error) {
        console.error("Error fetching service request:", error);
        res.status(500).json({ message: "Failed to fetch service request" });
      }
    }
  );

  app.post("/api/service-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        requesterId: userId,
        requestedDate: req.body.requestedDate ? new Date(req.body.requestedDate) : undefined,
      });
      const request = await storage.createServiceRequest(requestData);

      const requester = await storage.getUser(userId);
      if (requester) {
        const admins = await storage.getUsersByRoles(["admin"]);
        notifyNewServiceRequest(request, requester, admins, notificationService).catch(err =>
          console.error("Failed to send service request notification emails:", err)
        );
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating service request:", error);
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  app.patch("/api/service-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const request = await storage.getServiceRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Only requester or admin can edit
      if (request.requesterId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Cannot edit this request" });
      }

      const validated = insertServiceRequestSchema.partial().parse(req.body);
      const updatedRequest = await storage.updateServiceRequest(req.params.id, validated);
      res.json(updatedRequest);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating service request:", error);
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  app.delete("/api/service-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const request = await storage.getServiceRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Requester or admin can delete
      const canDelete =
        request.requesterId === userId ||
        currentUser?.role === "admin";

      if (!canDelete) {
        return res.status(403).json({ message: "Forbidden: Cannot delete this request" });
      }

      await storage.deleteServiceRequest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service request:", error);
      res.status(500).json({ message: "Failed to delete service request" });
    }
  });

  app.patch(
    "/api/service-requests/:id/status",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const reqStatusSchema = z.object({
          status: z.string().min(1),
          rejectionReason: z.string().optional(),
        });
        const { status, rejectionReason } = reqStatusSchema.parse(req.body);

        const request = await storage.updateServiceRequestStatus(
          req.params.id,
          status,
          rejectionReason
        );

        res.json(request);
      } catch (error: any) {
        if (error.name === "ZodError") {
          return res.status(400).json({ message: "Invalid status data", errors: error.errors });
        }
        console.error("Error updating service request status:", error);
        res
          .status(500)
          .json({ message: "Failed to update service request status" });
      }
    }
  );

  // Task routes (admin, maintenance, student, technician)
  // Students and technicians can only see their assigned tasks filtered by executor type
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Staff role cannot access tasks
      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot access tasks" });
      }

      let filters: any = {};

      // When fetching equipment work history, bypass role-based task filtering
      // so techs/students can see all historical tasks on a piece of equipment
      const equipmentIdFilter = req.query.equipmentId as string | undefined;

      if (!equipmentIdFilter) {
        // Role-based filtering only applies when NOT querying by equipment
        if (currentUser.role === "student") {
          filters.assignedToId = userId;
        } else if (currentUser.role === "technician") {
          filters.assignedToId = userId;
        }
      }
      // Admin sees all

      // Optional filters from query params
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.assignedToId && currentUser.role === "admin") {
        filters.assignedToId = req.query.assignedToId;
      }
      if (req.query.assignedVendorId) {
        filters.assignedVendorId = req.query.assignedVendorId;
      }
      if (req.query.areaId) {
        filters.areaId = req.query.areaId;
      }
      if (req.query.executorType && currentUser.role === "admin") {
        filters.executorType = req.query.executorType;
      }
      if (equipmentIdFilter) {
        filters.equipmentId = equipmentIdFilter;
      }

      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Role-based access control for viewing tasks
      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot access tasks" });
      }
      
      // Students can only view tasks directly assigned to them
      if (currentUser.role === "student") {
        if (task.assignedToId !== userId) {
          return res.status(403).json({ message: "Forbidden: You can only view tasks assigned to you" });
        }
      }
      
      // Technicians can only view tasks directly assigned to them
      if (currentUser.role === "technician") {
        if (task.assignedToId !== userId) {
          return res.status(403).json({ message: "Forbidden: You can only view tasks assigned to you" });
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { checklists, checklistGroups, ...taskPayload } = req.body;
      
      // Validate task data
      const taskData = insertTaskSchema.parse({
        ...taskPayload,
        createdById: userId,
        initialDate: taskPayload.initialDate ? new Date(taskPayload.initialDate) : new Date(),
        estimatedCompletionDate: taskPayload.estimatedCompletionDate ? new Date(taskPayload.estimatedCompletionDate) : undefined,
      });

      // Schema for grouped checklists (new model)
      const checklistGroupSchema = z.array(z.object({
        name: z.string().min(1, "Checklist name is required"),
        sortOrder: z.number().optional(),
        items: z.array(z.object({
          text: z.string().min(1, "Checklist item text is required"),
          isCompleted: z.boolean().optional().default(false),
          sortOrder: z.number().optional(),
        })),
      })).optional();

      // Legacy flat checklist schema (backward compatibility)
      const flatChecklistSchema = z.array(z.object({
        text: z.string().min(1, "Checklist item text is required"),
        isCompleted: z.boolean().optional().default(false),
        sortOrder: z.number().optional(),
      })).optional();
      
      const validatedGroups = checklistGroupSchema.parse(checklistGroups);
      const validatedFlatChecklists = flatChecklistSchema.parse(checklists);

      let task;
      
      // Prioritize grouped checklists over flat checklists
      if (validatedGroups && validatedGroups.length > 0) {
        const result = await storage.createTaskWithChecklistGroups(taskData, validatedGroups);
        task = result.task;
      } else if (validatedFlatChecklists && validatedFlatChecklists.length > 0) {
        // Legacy: use flat checklists
        const result = await storage.createTaskWithChecklists(taskData, validatedFlatChecklists);
        task = result.task;
      } else {
        task = await storage.createTask(taskData);
      }

      if (task.projectId) {
        await syncProjectStatusFromTasks(task.projectId);
      }

      // If request was linked, update its status to converted_to_task
      if (task.requestId) {
        try {
          await storage.updateServiceRequestStatus(task.requestId, 'converted_to_task');
        } catch (err) {
          console.error("Error updating request status:", err);
        }
      }

      // Fire task created + assignment notifications
      try {
        const admins = await storage.getUsersByRoles(["admin"]);
        if (task.requestId) {
          const linkedRequest = await storage.getServiceRequest(task.requestId);
          const requester = task.createdById ? await storage.getUser(task.createdById) : null;
          if (linkedRequest && requester) {
            notifyTaskCreated(linkedRequest, requester, admins, notificationService).catch(err =>
              console.error("Failed to send task created notification:", err)
            );
          }
        }
        if (task.assignedToId) {
          const assignedUser = await storage.getUser(task.assignedToId);
          if (assignedUser) {
            const fakeRequest = {
              title: task.name,
              description: task.description,
              urgency: task.urgency,
            } as any;
            notifyTaskAssigned(fakeRequest, assignedUser, notificationService).catch(err =>
              console.error("Failed to send task assigned notification:", err)
            );
          }
        }
      } catch (notifyErr) {
        console.error("Notification error after task creation:", notifyErr);
      }

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if technician/student can access this task
      if (currentUser.role === "technician" || currentUser.role === "student") {
        const task = await storage.getTask(req.params.id);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        
        // Subtask structural edits (name, description for subtasks) are admin-only
        if (task.parentTaskId) {
          const isStructuralEdit = req.body.name !== undefined || req.body.description !== undefined;
          if (isStructuralEdit) {
            return res.status(403).json({ message: "Only admins can rename or modify subtasks" });
          }
        }

        // Technicians can only update tasks directly assigned to them, or technician-type tasks in the technician pool
        if (currentUser.role === "technician") {
          const directlyAssigned = task.assignedToId === userId;
          const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
          if (!directlyAssigned && !inPool) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
        }
        
        // Students can only update tasks directly assigned to them, or student-type tasks in the student pool
        if (currentUser.role === "student") {
          const directlyAssigned = task.assignedToId === userId;
          const inPool = task.executorType === "student" && task.assignedPool === "student_pool";
          if (!directlyAssigned && !inPool) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
          // Students cannot reassign tasks
          if (req.body.assignedToId !== undefined) {
            return res.status(403).json({ message: "Forbidden: Students cannot reassign tasks" });
          }
        }
      }

      const updateData: any = { ...req.body };

      if (updateData.status === "ready") {
        updateData.status = "not_started";
      }

      if (updateData.status === "completed") {
        const currentTask = await storage.getTask(req.params.id);
        if (currentTask?.requiresEstimate) {
          const taskQuotes = await storage.getQuotesByTaskId(req.params.id);
          if (taskQuotes.length === 0) {
            return res.status(400).json({ message: "Submit an estimate before completing this task" });
          }
          if (currentTask.estimateStatus !== "approved") {
            return res.status(400).json({ message: "Estimates must be approved before completing this task" });
          }
        }
      }

      // Handle date conversions
      if (updateData.actualCompletionDate) {
        updateData.actualCompletionDate = new Date(updateData.actualCompletionDate);
      }
      if (updateData.initialDate) {
        updateData.initialDate = new Date(updateData.initialDate);
      }
      if (updateData.estimatedCompletionDate) {
        updateData.estimatedCompletionDate = new Date(updateData.estimatedCompletionDate);
      }

      const task = await storage.updateTask(req.params.id, updateData);

      if (task?.projectId) {
        await syncProjectStatusFromTasks(task.projectId);
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const taskToDelete = await storage.getTask(req.params.id);
      await storage.deleteTask(req.params.id);

      if (taskToDelete?.projectId) {
        await syncProjectStatusFromTasks(taskToDelete.projectId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get("/api/tasks/:taskId/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const subTasks = await storage.getSubTasks(req.params.taskId);
      res.json(subTasks);
    } catch (error) {
      console.error("Error fetching sub-tasks:", error);
      res.status(500).json({ message: "Failed to fetch sub-tasks" });
    }
  });

  app.post("/api/tasks/:taskId/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const parentTask = await storage.getTask(req.params.taskId);
      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      const currentUser = await storage.getUser(req.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create sub-tasks" });
      }

      const { equipmentId, vehicleId, description } = req.body;
      const name = typeof req.body.name === "string" ? req.body.name.trim() : undefined;

      if (!equipmentId && !vehicleId && !name) {
        return res.status(400).json({ message: "Either equipmentId, vehicleId, or name is required" });
      }

      let assetName = "";
      if (equipmentId) {
        const equip = await storage.getEquipmentItem(equipmentId);
        if (!equip) return res.status(404).json({ message: "Equipment not found" });
        const locationParts = [];
        if (equip.propertyId) {
          const prop = await storage.getProperty(equip.propertyId);
          if (prop) locationParts.push(prop.name);
        }
        assetName = equip.name + (locationParts.length ? ` (${locationParts.join(", ")})` : "");
      } else if (vehicleId) {
        const vehicle = await storage.getVehicle(vehicleId);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        assetName = `${vehicle.make} ${vehicle.model} ${vehicle.vehicleId}`;
      }

      const subTaskName = name || `${parentTask.name} — ${assetName}`;

      const subTaskData: any = {
        name: subTaskName,
        description: description || parentTask.description,
        urgency: parentTask.urgency,
        taskType: parentTask.taskType,
        initialDate: parentTask.initialDate,
        estimatedCompletionDate: parentTask.estimatedCompletionDate,
        assignedToId: parentTask.assignedToId,
        areaId: parentTask.areaId,
        propertyId: equipmentId ? (await storage.getEquipmentItem(equipmentId))?.propertyId || parentTask.propertyId : parentTask.propertyId,
        spaceId: equipmentId ? (await storage.getEquipmentItem(equipmentId))?.spaceId || parentTask.spaceId : parentTask.spaceId,
        executorType: parentTask.executorType,
        instructions: parentTask.instructions,
        requiresPhoto: parentTask.requiresPhoto,
        createdById: req.userId,
        parentTaskId: parentTask.id,
        status: "not_started" as const,
        equipmentId: equipmentId || null,
        vehicleId: vehicleId || null,
      };

      const subTask = await storage.createTask(subTaskData);
      res.status(201).json(subTask);
    } catch (error) {
      console.error("Error creating sub-task:", error);
      res.status(500).json({ message: "Failed to create sub-task" });
    }
  });

  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const taskStatusSchema = z.object({
        status: z.string().min(1),
        onHoldReason: z.string().optional(),
      });
      const { status, onHoldReason } = taskStatusSchema.parse(req.body);
      const taskId = req.params.id;
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const normalizedStatus = status === "ready" ? "not_started" : status;

      // Get the task to check access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Role-based access control for updating task status
      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot update tasks" });
      }
      
      // Students can only update tasks directly assigned to them, or student-type tasks in the student pool
      if (currentUser.role === "student") {
        const directlyAssigned = task.assignedToId === userId;
        const inPool = task.executorType === "student" && task.assignedPool === "student_pool";
        if (!directlyAssigned && !inPool) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }
      
      // Technicians can only update tasks directly assigned to them, or technician-type tasks in the technician pool
      if (currentUser.role === "technician") {
        const directlyAssigned = task.assignedToId === userId;
        const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
        if (!directlyAssigned && !inPool) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }

      if (normalizedStatus === "completed" && task.requiresEstimate) {
        const taskQuotes = await storage.getQuotesByTaskId(taskId);
        if (taskQuotes.length === 0) {
          return res.status(400).json({ message: "Submit an estimate before completing this task" });
        }
        if (task.estimateStatus !== "approved") {
          return res.status(400).json({ message: "Estimates must be approved before completing this task" });
        }
      }

      const updateData: any = { status: normalizedStatus };
      if (normalizedStatus === "completed") {
        updateData.actualCompletionDate = new Date();
      }
      if (normalizedStatus === "on_hold" && onHoldReason) {
        updateData.onHoldReason = onHoldReason;
      }

      const updatedTask = await storage.updateTask(taskId, updateData);

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (updatedTask.projectId) {
        await syncProjectStatusFromTasks(updatedTask.projectId);
      }

      // Fire status change notification if task has a linked request
      if (updatedTask.requestId) {
        try {
          const linkedRequest = await storage.getServiceRequest(updatedTask.requestId);
          if (linkedRequest) {
            const requester = await storage.getUser(linkedRequest.requesterId);
            if (requester) {
              notifyStatusChange(linkedRequest, requester, task.status, normalizedStatus, notificationService).catch(err =>
                console.error("Failed to send status change notification:", err)
              );
            }
          }
        } catch (notifyErr) {
          console.error("Notification error on status change:", notifyErr);
        }
      }

      // Create a task note if hold reason was provided
      if (normalizedStatus === "on_hold" && onHoldReason) {
        await storage.createTaskNote({
          taskId,
          userId: (req as any).userId,
          content: `Task placed on hold: ${onHoldReason}`,
          noteType: "job_note"
        });

        // Send message to requester if task is linked to a request
        if (updatedTask.requestId) {
          await storage.createMessage({
            requestId: updatedTask.requestId,
            senderId: (req as any).userId,
            content: `Task "${updatedTask.name}" has been placed on hold. Reason: ${onHoldReason}`
          });
        }
      } else if (normalizedStatus === "completed" && updatedTask.requestId) {
        // Send completion message to requester
        await storage.createMessage({
          requestId: updatedTask.requestId,
          senderId: (req as any).userId,
          content: `Task "${updatedTask.name}" has been completed.`
        });
      }

      // Helper: auto-create vehicle maintenance log for a completed task
      async function autoCreateVehicleMaintenanceLog(completedTask: any) {
        if (!completedTask.vehicleId) return;
        try {
          const existingLog = await storage.getVehicleMaintenanceLogByTaskId(completedTask.id);
          if (existingLog) return;

          const vehicle = await storage.getVehicle(completedTask.vehicleId);
          if (!vehicle) return;

          const parts = await storage.getPartsByTask(completedTask.id);
          let totalCost = 0;
          for (const part of parts) {
            totalCost += (Number(part.cost) || 0) * (Number(part.quantity) || 1);
          }

          const taskQuotes = await storage.getQuotesByTaskId(completedTask.id);
          const approvedQuote = taskQuotes.find((q: any) => q.status === "approved");
          if (approvedQuote) {
            totalCost += Number(approvedQuote.estimatedCost) || 0;
          }

          let performedBy = "Maintenance Staff";
          if (completedTask.assignedToId) {
            const tech = await storage.getUser(completedTask.assignedToId);
            if (tech) {
              performedBy = [tech.firstName, tech.lastName].filter(Boolean).join(" ") || tech.username;
            }
          }

          const taskNotes = await storage.getNotesByTask(completedTask.id);
          const notesText = taskNotes.map((n: any) => n.content).filter(Boolean).join("; ");

          let maintenanceType = "repair";
          const nameLower = completedTask.name.toLowerCase();
          if (nameLower.includes("inspect")) maintenanceType = "inspection";
          else if (nameLower.includes("oil change")) maintenanceType = "oil_change";
          else if (nameLower.includes("tire")) maintenanceType = "tire";
          else if (nameLower.includes("brake")) maintenanceType = "brake";
          else if (nameLower.includes("filter")) maintenanceType = "filter";

          const partsNotes = parts.length > 0
            ? "Parts used: " + parts.map((p: any) => `${p.name} x${p.quantity}`).join(", ")
            : "";

          await storage.createVehicleMaintenanceLog({
            vehicleId: completedTask.vehicleId,
            taskId: completedTask.id,
            maintenanceDate: completedTask.actualCompletionDate || new Date(),
            type: maintenanceType,
            description: completedTask.description || completedTask.name,
            cost: totalCost,
            mileageAtMaintenance: vehicle.currentMileage,
            performedBy,
            notes: [notesText, partsNotes].filter(Boolean).join(". ") || null,
          });
        } catch (err) {
          console.error("Error auto-creating vehicle maintenance log:", err);
        }
      }

      // Sub-task auto-completion: when a sub-task completes, check if all siblings are done
      if (normalizedStatus === "completed" && updatedTask.parentTaskId) {
        try {
          const siblings = await storage.getSubTasks(updatedTask.parentTaskId);
          const allCompleted = siblings.every(s => s.status === "completed");
          if (allCompleted) {
            const completedParent = await storage.updateTask(updatedTask.parentTaskId, {
              status: "completed" as any,
              actualCompletionDate: new Date(),
            });
            if (completedParent?.projectId) {
              await syncProjectStatusFromTasks(completedParent.projectId);
            }
            if (completedParent) {
              await autoCreateVehicleMaintenanceLog(completedParent);
            }
          }
        } catch (err) {
          console.error("Error in sub-task auto-completion:", err);
        }
      }

      // Sub-task auto-start: when a sub-task starts, auto-start the parent
      if (normalizedStatus === "in_progress" && updatedTask.parentTaskId) {
        try {
          const parentTask = await storage.getTask(updatedTask.parentTaskId);
          if (parentTask && parentTask.status === "not_started") {
            await storage.updateTask(updatedTask.parentTaskId, {
              status: "in_progress" as any,
            });
          }
        } catch (err) {
          console.error("Error in sub-task auto-start:", err);
        }
      }

      // Auto-create vehicle maintenance log when a vehicle-linked task completes
      if (normalizedStatus === "completed") {
        await autoCreateVehicleMaintenanceLog(updatedTask);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Time tracking routes (for tasks)
  app.post("/api/time-entries", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskId = req.body.taskId;
      
      // Verify user has access to the task
      if (taskId) {
        const hasAccess = await canAccessTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }
      
      const entry = await storage.createTimeEntry({
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        userId,
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.patch("/api/time-entries/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const timeEntry = await storage.getTimeEntry(req.params.id);

      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      // Verify user has access to the task
      if (timeEntry.taskId) {
        const hasAccess = await canAccessTask(userId, timeEntry.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      // Verify ownership - only the user who created the entry can update it
      if (timeEntry.userId !== userId) {
        // Get current user to check if admin
        const currentUser = await storage.getUser(userId);
        if (currentUser?.role !== "admin") {
          return res.status(403).json({ message: "Forbidden: You can only update your own time entries" });
        }
      }

      const timeEntryUpdateSchema = z.object({
        endTime: z.string().refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid endTime format" }),
        durationMinutes: z.number().int().min(0).optional(),
      });

      const parsed = timeEntryUpdateSchema.parse(req.body);
      const parsedEndTime = new Date(parsed.endTime);

      const entry = await storage.updateTimeEntry(
        req.params.id,
        parsedEndTime,
        parsed.durationMinutes
      );
      res.json(entry);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      console.error("Error updating time entry:", error);
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.get(
    "/api/time-entries/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const entries = await storage.getTimeEntriesByTask(
          req.params.taskId
        );
        res.json(entries);
      } catch (error) {
        console.error("Error fetching time entries:", error);
        res.status(500).json({ message: "Failed to fetch time entries" });
      }
    }
  );

  // Parts routes (for tasks)
  app.post("/api/parts", isAuthenticated, requireTaskExecutorOrAdmin, requireTaskAccess(), async (req, res) => {
    try {
      const partData = insertPartUsedSchema.parse(req.body);
      const part = await storage.createPartUsed(partData);
      res.json(part);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ message: "Failed to create part" });
    }
  });

  app.delete("/api/parts/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const [part] = await db.select().from(partsUsed).where(eq(partsUsed.id, req.params.id));
      if (!part) {
        return res.status(404).json({ message: "Part not found" });
      }
      const hasAccess = await canAccessTask(req.currentUser?.id || req.userId, part.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      await storage.deletePartUsed(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting part:", error);
      res.status(500).json({ message: "Failed to delete part" });
    }
  });

  app.get(
    "/api/parts/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const parts = await storage.getPartsByTask(req.params.taskId);
        res.json(parts);
      } catch (error) {
        console.error("Error fetching parts:", error);
        res.status(500).json({ message: "Failed to fetch parts" });
      }
    }
  );

  // Message routes (can be on requests or tasks)
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      if (req.body.taskId) {
        const hasAccess = await canAccessTask(userId, req.body.taskId);
        if (!hasAccess && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this task" });
        }
      } else if (req.body.requestId) {
        const request = await storage.getServiceRequest(req.body.requestId);
        if (!request) return res.status(404).json({ message: "Service request not found" });
        if (request.requesterId !== userId && request.assignedTo !== userId && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this request" });
        }
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Get all messages
  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for a request
  app.get("/api/messages/request/:requestId", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByRequest(
        req.params.requestId
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark messages as read for a request
  app.post("/api/messages/request/:requestId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      await storage.markMessagesAsRead(req.params.requestId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  app.get(
    "/api/messages/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const messages = await storage.getMessagesByTask(
          req.params.taskId
        );
        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    }
  );

  // Mark messages as read for a task
  app.post("/api/messages/task/:taskId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      await storage.markTaskMessagesAsRead(req.params.taskId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking task messages as read:", error);
      res.status(500).json({ message: "Failed to mark task messages as read" });
    }
  });

  // Delete message (admin only)
  app.delete("/api/messages/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Get upload URL for Object Storage
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { getSignedUploadUrl } = await import("./objectStorage");
      const { uploadURL, objectPath } = await getSignedUploadUrl();

      res.json({ 
        uploadURL,
        objectPath,
        isMock: false
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ 
        message: "Failed to get upload URL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Image proxy: generates a fresh signed GET URL and redirects.
  // Accepts ?path= as either a relative objectPath ("uploads/key") or a full GCS URL.
  app.get("/api/objects/image", isAuthenticated, async (req, res) => {
    try {
      const { getDownloadUrl, getPrivateDir } = await import("./objectStorage");
      let rawPath = req.query.path as string;
      if (!rawPath) {
        return res.status(400).json({ message: "path query parameter is required" });
      }

      let objectKey: string;

      if (rawPath.startsWith("https://storage.googleapis.com/")) {
        // Extract the relative key from the GCS URL:
        // URL path is /bucket-name/.private/uploads/KEY
        const urlPath = new URL(rawPath).pathname; // e.g. /replit-objstore-UUID/.private/uploads/KEY
        const uploadsMatch = urlPath.match(/\/uploads\/(.+)$/);
        if (uploadsMatch) {
          objectKey = `uploads/${uploadsMatch[1]}`;
        } else {
          // Fallback: try extracting everything after the private dir marker
          const privateDir = getPrivateDir();
          if (privateDir) {
            const privateDirParts = privateDir.replace(/^\//, "").split("/");
            const privateDirName = privateDirParts.slice(1).join("/"); // e.g. ".private"
            const parts = urlPath.split("/").filter(Boolean);
            const idx = parts.findIndex((p) => p === privateDirName || p === ".private");
            if (idx >= 0) {
              objectKey = parts.slice(idx + 1).join("/");
            } else {
              objectKey = parts.slice(2).join("/");
            }
          } else {
            return res.status(400).json({ message: "Cannot resolve image path" });
          }
        }
      } else {
        objectKey = rawPath;
      }

      const signedUrl = await getDownloadUrl(objectKey);
      return res.redirect(302, signedUrl);
    } catch (error) {
      console.error("Error proxying image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Upload routes
  app.post("/api/uploads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      if (req.body.taskId) {
        const hasAccess = await canAccessTask(userId, req.body.taskId);
        if (!hasAccess && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this task" });
        }
      } else if (req.body.requestId) {
        const request = await storage.getServiceRequest(req.body.requestId);
        if (!request) return res.status(404).json({ message: "Service request not found" });
        if (request.requesterId !== userId && request.assignedTo !== userId && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this request" });
        }
      }

      // Validate required fields with detailed error messages
      const errors = [];
      if (!req.body.fileName) {
        errors.push({ field: "fileName", message: "fileName is required" });
      }
      if (!req.body.objectUrl) {
        errors.push({ field: "objectUrl", message: "objectUrl is required" });
      }
      if (!req.body.fileType) {
        errors.push({ field: "fileType", message: "fileType is required" });
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Invalid upload data", 
          errors 
        });
      }

      console.log("Upload payload received (POST):", JSON.stringify(req.body, null, 2));
      
      let objectUrl = req.body.objectUrl;
      // If it's a mock URL or we have a bucket, try to get a real signed URL
      if (req.body.objectPath && (!objectUrl.startsWith('http') || objectUrl.includes('mock-storage.local'))) {
        try {
          const { getDownloadUrl, getBucketId } = await import("./objectStorage");
          if (getBucketId()) {
            objectUrl = await getDownloadUrl(req.body.objectPath);
          }
        } catch (e) {
          console.warn("Could not get signed download URL, using original:", e);
        }
      }

      const uploadData = insertUploadSchema.parse({
        ...req.body,
        objectUrl,
        uploadedById: userId,
      });
      console.log("Upload data parsed successfully (POST)");
      const upload = await storage.createUpload(uploadData);
      res.json(upload);
    } catch (error: any) {
      console.error("Error creating upload:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid upload data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create upload" });
    }
  });

  // PUT endpoint for uploads (alternative to POST)
  app.put("/api/uploads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      if (req.body.taskId) {
        const hasAccess = await canAccessTask(userId, req.body.taskId);
        if (!hasAccess && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this task" });
        }
      } else if (req.body.requestId) {
        const request = await storage.getServiceRequest(req.body.requestId);
        if (!request) return res.status(404).json({ message: "Service request not found" });
        if (request.requesterId !== userId && request.assignedTo !== userId && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this request" });
        }
      }

      // Validate required fields
      if (!req.body.fileName || !req.body.objectUrl) {
        return res.status(400).json({ 
          message: "Invalid upload data", 
          errors: [
            { field: "fileName", message: "fileName is required" },
            { field: "objectUrl", message: "objectUrl is required" }
          ]
        });
      }

      console.log("Upload payload received (PUT):", JSON.stringify(req.body, null, 2));
      
      let objectUrl = req.body.objectUrl;
      // If it's a mock URL or we have a bucket, try to get a real signed URL
      if (req.body.objectPath && (!objectUrl.startsWith('http') || objectUrl.includes('mock-storage.local'))) {
        try {
          const { getDownloadUrl, getBucketId } = await import("./objectStorage");
          if (getBucketId()) {
            objectUrl = await getDownloadUrl(req.body.objectPath);
          }
        } catch (e) {
          console.warn("Could not get signed download URL, using original:", e);
        }
      }

      const uploadData = insertUploadSchema.parse({
        ...req.body,
        objectUrl,
        uploadedById: userId,
      });
      console.log("Upload data parsed successfully (PUT)");
      const upload = await storage.createUpload(uploadData);
      res.json(upload);
    } catch (error: any) {
      console.error("Error creating upload:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid upload data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create upload" });
    }
  });

  // Get signed download URL for a file
  app.get("/api/uploads/:uploadId/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const upload = await storage.getUpload(req.params.uploadId);
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Access control: verify user has permission to access this upload
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admins and technicians can access all uploads
      const isStaff = user.role === 'admin' || user.role === 'technician';
      
      // Regular users can only access uploads they uploaded or uploads attached to entities they have access to
      if (!isStaff) {
        let hasAccess = false;
        
        // Check if user uploaded this file
        if (upload.uploadedById === userId) {
          hasAccess = true;
        }
        
        // Check if upload is attached to user's service request
        if (!hasAccess && upload.requestId) {
          const request = await storage.getServiceRequest(upload.requestId);
          if (request && request.requesterId === userId) {
            hasAccess = true;
          }
        }
        
        // Check if upload is attached to a task (anyone authenticated can view task attachments)
        // since tasks are visible to all users who can see them
        if (!hasAccess && upload.taskId) {
          const task = await storage.getTask(upload.taskId);
          if (task) {
            // If task has a service request, check if user owns that request
            if (task.requestId) {
              const request = await storage.getServiceRequest(task.requestId);
              if (request && request.requesterId === userId) {
                hasAccess = true;
              }
            }
          }
        }
        
        // Check if upload is attached to vehicle logs - vehicle logs are visible to users who created them
        if (!hasAccess && upload.vehicleCheckOutLogId) {
          const checkOutLog = await storage.getVehicleCheckOutLog(upload.vehicleCheckOutLogId);
          if (checkOutLog && checkOutLog.userId === userId) {
            hasAccess = true;
          }
        }
        
        if (!hasAccess && upload.vehicleCheckInLogId) {
          const checkInLog = await storage.getVehicleCheckInLog(upload.vehicleCheckInLogId);
          if (checkInLog && checkInLog.userId === userId) {
            hasAccess = true;
          }
        }
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Check if this is a mock URL (file was never actually stored)
      if (upload.objectUrl.includes('mock-storage.local')) {
        return res.status(400).json({ 
          message: "This file was uploaded before storage was properly configured and cannot be downloaded.",
          isMock: true
        });
      }

      // If we have an objectPath, generate a new signed download URL
      if (upload.objectPath) {
        try {
          const { getDownloadUrl } = await import("./objectStorage");
          const downloadUrl = await getDownloadUrl(upload.objectPath);
          return res.json({ downloadUrl, fileName: upload.fileName });
        } catch (error) {
          console.error("Error getting signed download URL:", error);
          return res.status(500).json({ message: "Failed to generate download URL" });
        }
      }

      // Otherwise, try to extract object path from the stored URL and generate a signed URL
      if (upload.objectUrl.startsWith('https://storage.googleapis.com/')) {
        try {
          const { getDownloadUrl, getPrivateDir } = await import("./objectStorage");
          const privateDir = getPrivateDir();
          
          if (privateDir) {
            // Extract the object path from the URL
            // URL format: https://storage.googleapis.com/bucket-name/.private/uploads/filename
            const url = new URL(upload.objectUrl);
            const fullPath = url.pathname; // e.g., /bucket-name/.private/uploads/filename
            
            // Find the uploads portion of the path
            const uploadsMatch = fullPath.match(/\/uploads\/(.+)$/);
            if (uploadsMatch) {
              const objectPath = `uploads/${uploadsMatch[1]}`;
              const downloadUrl = await getDownloadUrl(objectPath);
              return res.json({ downloadUrl, fileName: upload.fileName });
            }
          }
        } catch (error) {
          console.error("Error generating signed URL from objectUrl:", error);
        }
        
        // Only return raw URL as last resort (this will likely fail for private files)
        return res.json({ downloadUrl: upload.objectUrl, fileName: upload.fileName });
      }

      return res.status(400).json({ message: "File cannot be downloaded - invalid storage URL" });
    } catch (error) {
      console.error("Error getting download URL:", error);
      res.status(500).json({ message: "Failed to get download URL" });
    }
  });

  app.get("/api/uploads/request/:requestId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByRequest(req.params.requestId);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching request uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  app.get("/api/uploads/task/:taskId", isAuthenticated, async (req, res) => {
    try {
      const taskUploads = await storage.getUploadsByTask(req.params.taskId);

      if (req.query.includeSubtasks === "true") {
        const subTasks = await storage.getSubTasks(req.params.taskId);
        const subtaskUploadArrays = await Promise.all(
          subTasks.map(st => storage.getUploadsByTask(st.id))
        );
        const allUploads = [...taskUploads, ...subtaskUploadArrays.flat()];
        return res.json(allUploads);
      }

      res.json(taskUploads);
    } catch (error) {
      console.error("Error fetching task uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  app.get("/api/uploads/vehicle-checkout/:checkOutLogId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByVehicleCheckOutLog(req.params.checkOutLogId);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching vehicle check-out uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  app.get("/api/uploads/vehicle-checkin/:checkInLogId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByVehicleCheckInLog(req.params.checkInLogId);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching vehicle check-in uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  app.delete("/api/uploads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const upload = await storage.getUpload(req.params.id);
      if (!upload) return res.status(404).json({ message: "Upload not found" });

      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      if (currentUser.role !== "admin" && upload.uploadedById !== userId) {
        let hasAccess = false;
        if (upload.taskId) {
          hasAccess = await canAccessTask(userId, upload.taskId);
        } else if (upload.requestId) {
          const request = await storage.getServiceRequest(upload.requestId);
          if (request && (request.requesterId === userId || request.assignedTo === userId)) {
            hasAccess = true;
          }
        }
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have permission to delete this upload" });
        }
      }

      await storage.deleteUpload(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting upload:", error);
      res.status(500).json({ message: "Failed to delete upload" });
    }
  });

  // Notification counts endpoint
  app.get("/api/notifications/counts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let pendingServiceRequests = 0;
      let pendingVehicleReservations = 0;
      let unreadMessages = 0;
      let approvedReservations = 0;

      if (currentUser.role === "admin" || currentUser.role === "technician") {
        const serviceRequests = await storage.getServiceRequests({
          status: "pending",
        });
        pendingServiceRequests = serviceRequests.length;

        const underReviewRequests = await storage.getServiceRequests({
          status: "under_review",
        });
        pendingServiceRequests += underReviewRequests.length;

        const vehicleReservations = await storage.getVehicleReservations({
          status: "pending",
        });
        pendingVehicleReservations = vehicleReservations.length;
      } else {
        // For staff users, count approved reservations that haven't been viewed
        const myReservations = await storage.getVehicleReservations({
          userId: userId,
        });
        approvedReservations = myReservations.filter(r => 
          r.lastViewedStatus === "pending" && r.status === "approved"
        ).length;
      }

      const messages = await storage.getMessages();
      unreadMessages = messages.filter(
        (msg) => !msg.read && msg.senderId !== userId
      ).length;

      res.json({
        pendingServiceRequests,
        pendingVehicleReservations,
        unreadMessages,
        approvedReservations,
      });
    } catch (error) {
      console.error("Error fetching notification counts:", error);
      res.status(500).json({ message: "Failed to fetch notification counts" });
    }
  });

  // Task notes routes (for tasks)
  app.post("/api/task-notes", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskId = req.body.taskId;
      
      // Verify user has access to the task
      if (taskId) {
        const hasAccess = await canAccessTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }
      
      const noteData = insertTaskNoteSchema.parse({
        ...req.body,
        userId,
      });
      const note = await storage.createTaskNote(noteData);
      res.json(note);
    } catch (error) {
      console.error("Error creating task note:", error);
      res.status(500).json({ message: "Failed to create task note" });
    }
  });

  app.get(
    "/api/task-notes/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const notes = await storage.getNotesByTask(req.params.taskId);
        res.json(notes);
      } catch (error) {
        console.error("Error fetching task notes:", error);
        res.status(500).json({ message: "Failed to fetch task notes" });
      }
    }
  );

  app.patch("/api/task-notes/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const noteId = req.params.id;
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }

      const note = await storage.getTaskNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Task note not found" });
      }

      const currentUser = await storage.getUser(userId);
      if (note.userId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own notes" });
      }

      if (note.taskId) {
        const hasAccess = await canAccessTask(userId, note.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      const updated = await storage.updateTaskNote(noteId, content);
      res.json(updated);
    } catch (error) {
      console.error("Error updating task note:", error);
      res.status(500).json({ message: "Failed to update task note" });
    }
  });

  app.delete("/api/task-notes/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const noteId = req.params.id;

      // Get the note to verify ownership
      const note = await storage.getTaskNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Task note not found" });
      }

      // Verify user has access to the task
      if (note.taskId) {
        const hasAccess = await canAccessTask(userId, note.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      // Only the user who created the note or admin can delete it
      if (note.userId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only delete your own notes" });
      }

      await storage.deleteTaskNote(noteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task note:", error);
      res.status(500).json({ message: "Failed to delete task note" });
    }
  });

  // Task checklist routes
  app.get("/api/tasks/:taskId/checklists", isAuthenticated, async (req: any, res) => {
    try {
      const checklists = await storage.getChecklistsByTask(req.params.taskId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching task checklists:", error);
      res.status(500).json({ message: "Failed to fetch task checklists" });
    }
  });

  app.post("/api/tasks/:taskId/checklists", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const checklistData = {
        taskId: req.params.taskId,
        text: req.body.text,
        isCompleted: req.body.isCompleted || false,
        sortOrder: req.body.sortOrder || 0,
      };
      const checklist = await storage.createTaskChecklist(checklistData);
      res.json(checklist);
    } catch (error) {
      console.error("Error creating task checklist:", error);
      res.status(500).json({ message: "Failed to create task checklist" });
    }
  });

  app.patch("/api/task-checklists/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      // Get the checklist to find the task ID
      const existingChecklist = await storage.getTaskChecklist(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      
      // Reject access if no task ID is linked (defensive check)
      if (!existingChecklist.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist has no associated task" });
      }
      
      // Verify user has access to the task
      const hasAccess = await canAccessTask(userId, existingChecklist.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      
      const validated = insertTaskChecklistSchema.partial().parse(req.body);
      const checklist = await storage.updateTaskChecklist(req.params.id, validated);
      res.json(checklist);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist data", errors: error.errors });
      }
      console.error("Error updating task checklist:", error);
      res.status(500).json({ message: "Failed to update task checklist" });
    }
  });

  app.delete("/api/task-checklists/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteTaskChecklist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task checklist:", error);
      res.status(500).json({ message: "Failed to delete task checklist" });
    }
  });

  // Checklist group routes (named/grouped checklists)
  app.get("/api/tasks/:taskId/checklist-groups", isAuthenticated, async (req: any, res) => {
    try {
      const groups = await storage.getChecklistGroupsByTask(req.params.taskId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching checklist groups:", error);
      res.status(500).json({ message: "Failed to fetch checklist groups" });
    }
  });

  app.post("/api/tasks/:taskId/checklist-groups", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const groupData = {
        taskId: req.params.taskId,
        name: req.body.name,
        sortOrder: req.body.sortOrder || 0,
      };
      const group = await storage.createChecklistGroup(groupData);
      res.json(group);
    } catch (error) {
      console.error("Error creating checklist group:", error);
      res.status(500).json({ message: "Failed to create checklist group" });
    }
  });

  app.patch("/api/checklist-groups/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      // Get the group to find the task ID
      const existingGroup = await storage.getChecklistGroup(req.params.id);
      if (!existingGroup) {
        return res.status(404).json({ message: "Checklist group not found" });
      }
      
      // Reject access if no task ID is linked (defensive check)
      if (!existingGroup.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist group has no associated task" });
      }
      
      // Verify user has access to the task
      const hasAccess = await canAccessTask(userId, existingGroup.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      
      const groupUpdateSchema = z.object({
        name: z.string().optional(),
        sortOrder: z.number().optional(),
      });
      const validated = groupUpdateSchema.parse(req.body);
      const group = await storage.updateChecklistGroup(req.params.id, validated);
      res.json(group);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      console.error("Error updating checklist group:", error);
      res.status(500).json({ message: "Failed to update checklist group" });
    }
  });

  app.delete("/api/checklist-groups/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteChecklistGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist group:", error);
      res.status(500).json({ message: "Failed to delete checklist group" });
    }
  });

  // Checklist item routes (items within groups)
  app.post("/api/checklist-groups/:groupId/items", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const itemData = {
        groupId: req.params.groupId,
        text: req.body.text,
        isCompleted: req.body.isCompleted || false,
        sortOrder: req.body.sortOrder || 0,
      };
      const item = await storage.createChecklistItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating checklist item:", error);
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      // Get the item to find the group, then the task ID
      const existingItem = await storage.getChecklistItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      
      // Reject access if no group ID is linked (defensive check)
      if (!existingItem.groupId) {
        return res.status(403).json({ message: "Forbidden: Checklist item has no associated group" });
      }
      
      // Get the group to find the task ID
      const group = await storage.getChecklistGroup(existingItem.groupId);
      if (!group) {
        return res.status(404).json({ message: "Checklist group not found" });
      }
      
      // Reject access if group has no task ID (defensive check)
      if (!group.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist group has no associated task" });
      }
      
      // Verify user has access to the task
      const hasAccess = await canAccessTask(userId, group.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      
      const itemUpdateSchema = z.object({
        text: z.string().optional(),
        isCompleted: z.boolean().optional(),
        sortOrder: z.number().optional(),
        completedById: z.string().nullable().optional(),
      });
      const validated = itemUpdateSchema.parse(req.body);
      const item = await storage.updateChecklistItem(req.params.id, validated);
      res.json(item);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid checklist item data", errors: error.errors });
      }
      console.error("Error updating checklist item:", error);
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteChecklistItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // Property routes
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(req.params.id, validated);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  app.get("/api/properties/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByProperty(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching property tasks:", error);
      res.status(500).json({ message: "Failed to fetch property tasks" });
    }
  });

  app.get("/api/properties/:id/resources", isAuthenticated, async (req, res) => {
    try {
      const resources = await storage.getPropertyResources(req.params.id);
      res.json(resources);
    } catch (error) {
      console.error("Error fetching property resources:", error);
      res.status(500).json({ message: "Failed to fetch property resources" });
    }
  });

  // Resource Library routes
  app.get("/api/resource-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getResourceCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching resource categories:", error);
      res.status(500).json({ message: "Failed to fetch resource categories" });
    }
  });

  app.post("/api/resource-categories", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, color } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Category name is required" });
      }
      const category = await storage.createResourceCategory({ name: name.trim(), color: color || "gray" });
      res.status(201).json(category);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "A category with this name already exists" });
      }
      console.error("Error creating resource category:", error);
      res.status(500).json({ message: "Failed to create resource category" });
    }
  });

  // Resource folder routes
  app.get("/api/resource-folders", isAuthenticated, async (req, res) => {
    try {
      if (req.query.all === "true") {
        const folders = await storage.getAllResourceFolders();
        return res.json(folders);
      }
      const parentId = req.query.parentId as string | undefined;
      const folders = await storage.getResourceFolders(parentId || null);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching resource folders:", error);
      res.status(500).json({ message: "Failed to fetch resource folders" });
    }
  });

  app.get("/api/resource-folders/:id", isAuthenticated, async (req, res) => {
    try {
      const folder = await storage.getResourceFolderById(req.params.id);
      if (!folder) return res.status(404).json({ message: "Folder not found" });
      res.json(folder);
    } catch (error) {
      console.error("Error fetching resource folder:", error);
      res.status(500).json({ message: "Failed to fetch resource folder" });
    }
  });

  app.post("/api/resource-folders", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, parentId } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Folder name is required" });
      }
      const folder = await storage.createResourceFolder({ name: name.trim(), parentId: parentId || null });
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating resource folder:", error);
      res.status(500).json({ message: "Failed to create resource folder" });
    }
  });

  app.patch("/api/resource-folders/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const folderUpdateSchema = z.object({
        name: z.string().min(1).optional(),
        parentId: z.string().nullable().optional(),
      });
      const { name, parentId } = folderUpdateSchema.parse(req.body);
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (parentId !== undefined) updateData.parentId = parentId || null;
      const folder = await storage.updateResourceFolder(req.params.id, updateData);
      if (!folder) return res.status(404).json({ message: "Folder not found" });
      res.json(folder);
    } catch (error: any) {
      if (error.message?.includes("circular") || error.message?.includes("own parent")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error updating resource folder:", error);
      res.status(500).json({ message: "Failed to update resource folder" });
    }
  });

  app.delete("/api/resource-folders/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteResourceFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resource folder:", error);
      res.status(500).json({ message: "Failed to delete resource folder" });
    }
  });

  app.get("/api/resources", isAuthenticated, async (req, res) => {
    try {
      const filters: { categoryId?: string; type?: string; folderId?: string | null } = {};
      if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
      if (req.query.type) filters.type = req.query.type as string;
      if (req.query.folderId === "root") {
        filters.folderId = null;
      } else if (req.query.folderId) {
        filters.folderId = req.query.folderId as string;
      }
      const resourceList = await storage.getResources(filters);
      res.json(resourceList);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.get("/api/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const resource = await storage.getResourceById(req.params.id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });
      res.json(resource);
    } catch (error) {
      console.error("Error fetching resource:", error);
      res.status(500).json({ message: "Failed to fetch resource" });
    }
  });

  app.post("/api/resources", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { propertyIds = [], ...data } = req.body;
      if (!data.title || !data.type || !data.url) {
        return res.status(400).json({ message: "Title, type, and url are required" });
      }
      if (!data.categoryId) data.categoryId = null;
      if (!data.folderId) data.folderId = null;
      if (!data.equipmentId) data.equipmentId = null;
      if (!data.equipmentCategory) data.equipmentCategory = null;
      const user = req.user as any;
      const resource = await storage.createResource(
        { ...data, createdById: user?.id },
        Array.isArray(propertyIds) ? propertyIds : []
      );
      res.status(201).json(resource);
    } catch (error) {
      console.error("Error creating resource:", error);
      res.status(500).json({ message: "Failed to create resource" });
    }
  });

  app.patch("/api/resources/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { propertyIds = [], ...rawData } = req.body;
      const data: any = insertResourceSchema.partial().parse(rawData);
      if ("categoryId" in data && !data.categoryId) data.categoryId = null;
      if ("folderId" in data && !data.folderId) data.folderId = null;
      if ("equipmentId" in data && !data.equipmentId) data.equipmentId = null;
      if ("equipmentCategory" in data && !data.equipmentCategory) data.equipmentCategory = null;
      const resource = await storage.updateResource(
        req.params.id,
        data,
        Array.isArray(propertyIds) ? propertyIds : []
      );
      if (!resource) return res.status(404).json({ message: "Resource not found" });
      res.json(resource);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid resource data", errors: error.errors });
      }
      console.error("Error updating resource:", error);
      res.status(500).json({ message: "Failed to update resource" });
    }
  });

  app.delete("/api/resources/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteResource(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ message: "Failed to delete resource" });
    }
  });

  // Space routes (rooms within buildings)
  app.get("/api/spaces", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      
      let spacesData;
      if (propertyId) {
        spacesData = await storage.getSpacesByProperty(propertyId);
      } else {
        spacesData = await storage.getSpaces();
      }
      
      res.json(spacesData);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      res.status(500).json({ message: "Failed to fetch spaces" });
    }
  });

  app.get("/api/spaces/:id", isAuthenticated, async (req, res) => {
    try {
      const space = await storage.getSpace(req.params.id);
      if (!space) {
        return res.status(404).json({ message: "Space not found" });
      }
      res.json(space);
    } catch (error) {
      console.error("Error fetching space:", error);
      res.status(500).json({ message: "Failed to fetch space" });
    }
  });

  app.post("/api/spaces", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const spaceData = insertSpaceSchema.parse(req.body);
      
      // Verify property exists and is a building
      const property = await storage.getProperty(spaceData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (property.type !== "building") {
        return res.status(400).json({ message: "Spaces can only be added to building properties" });
      }
      
      const space = await storage.createSpace(spaceData);
      res.json(space);
    } catch (error) {
      console.error("Error creating space:", error);
      res.status(500).json({ message: "Failed to create space" });
    }
  });

  app.patch("/api/spaces/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertSpaceSchema.partial().parse(req.body);
      const space = await storage.updateSpace(req.params.id, validated);
      if (!space) {
        return res.status(404).json({ message: "Space not found" });
      }
      res.json(space);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid space data", errors: error.errors });
      }
      console.error("Error updating space:", error);
      res.status(500).json({ message: "Failed to update space" });
    }
  });

  app.delete("/api/spaces/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSpace(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting space:", error);
      res.status(500).json({ message: "Failed to delete space" });
    }
  });

  // Equipment routes
  app.get("/api/equipment", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const spaceId = req.query.spaceId as string;
      const category = req.query.category as string;

      let equipment;
      if (propertyId && spaceId) {
        // When both propertyId and spaceId are provided, get equipment for the property
        // that either has no space assigned OR belongs to the specific space
        equipment = await storage.getEquipmentByPropertyAndSpace(propertyId, spaceId);
      } else if (spaceId) {
        equipment = await storage.getEquipmentBySpace(spaceId);
      } else if (propertyId && category) {
        equipment = await storage.getEquipmentByCategory(propertyId, category);
      } else if (propertyId) {
        equipment = await storage.getEquipmentByProperty(propertyId);
      } else {
        equipment = await storage.getEquipment();
      }

      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/:id", isAuthenticated, async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(404).json({ message: "Equipment not found" });
    }
    try {
      const item = await storage.getEquipmentItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      const item = await storage.createEquipment(equipmentData);
      res.json(item);
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.patch("/api/equipment/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertEquipmentSchema.partial().parse(req.body);
      const item = await storage.updateEquipment(req.params.id, validated);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  app.delete("/api/equipment/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEquipment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  // Equipment resources (manuals, videos linked to this equipment or its category)
  app.get("/api/equipment/:id/resources", isAuthenticated, async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.json([]);
    }
    try {
      const resourceList = await storage.getEquipmentResources(req.params.id);
      res.json(resourceList);
    } catch (error) {
      console.error("Error fetching equipment resources:", error);
      res.status(500).json({ message: "Failed to fetch equipment resources" });
    }
  });

  // Equipment uploads
  app.get("/api/equipment/:id/uploads", isAuthenticated, async (req, res) => {
    try {
      const equipmentId = req.params.id;
      const equipmentUploads = await storage.getUploadsByEquipment(equipmentId);
      res.json(equipmentUploads);
    } catch (error) {
      console.error("Error fetching equipment uploads:", error);
      res.status(500).json({ message: "Failed to fetch equipment uploads" });
    }
  });

  // Lockbox routes
  app.get("/api/lockboxes", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const lockboxes = await storage.getLockboxes();
      res.json(lockboxes);
    } catch (error) {
      console.error("Error fetching lockboxes:", error);
      res.status(500).json({ message: "Failed to fetch lockboxes" });
    }
  });

  app.get("/api/lockboxes/:id", isAuthenticated, async (req, res) => {
    try {
      const lockbox = await storage.getLockbox(req.params.id);
      if (!lockbox) return res.status(404).json({ message: "Lockbox not found" });
      res.json(lockbox);
    } catch (error) {
      console.error("Error fetching lockbox:", error);
      res.status(500).json({ message: "Failed to fetch lockbox" });
    }
  });

  app.post("/api/lockboxes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = insertLockboxSchema.parse(req.body);
      const lockbox = await storage.createLockbox(parsed);
      res.status(201).json(lockbox);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: "Invalid lockbox data", errors: error.errors });
      console.error("Error creating lockbox:", error);
      res.status(500).json({ message: "Failed to create lockbox" });
    }
  });

  app.patch("/api/lockboxes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = insertLockboxSchema.partial().parse(req.body);
      const lockbox = await storage.updateLockbox(req.params.id, parsed);
      if (!lockbox) return res.status(404).json({ message: "Lockbox not found" });
      res.json(lockbox);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: "Invalid lockbox data", errors: error.errors });
      console.error("Error updating lockbox:", error);
      res.status(500).json({ message: "Failed to update lockbox" });
    }
  });

  app.delete("/api/lockboxes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteLockbox(req.params.id);
      res.json({ message: "Lockbox deleted" });
    } catch (error) {
      console.error("Error deleting lockbox:", error);
      res.status(500).json({ message: "Failed to delete lockbox" });
    }
  });

  app.get("/api/lockboxes/:id/codes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const codes = await storage.getLockboxCodes(req.params.id);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching lockbox codes:", error);
      res.status(500).json({ message: "Failed to fetch lockbox codes" });
    }
  });

  app.post("/api/lockboxes/:id/codes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = insertLockboxCodeSchema.omit({ lockboxId: true }).parse(req.body);
      const code = await storage.createLockboxCode({ ...parsed, lockboxId: req.params.id });
      res.status(201).json(code);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: "Invalid code data", errors: error.errors });
      console.error("Error creating lockbox code:", error);
      res.status(500).json({ message: "Failed to create lockbox code" });
    }
  });

  app.patch("/api/lockbox-codes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const parsed = insertLockboxCodeSchema.partial().parse(req.body);
      const code = await storage.updateLockboxCode(req.params.id, parsed);
      if (!code) return res.status(404).json({ message: "Code not found" });
      res.json(code);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: "Invalid code data", errors: error.errors });
      console.error("Error updating lockbox code:", error);
      res.status(500).json({ message: "Failed to update lockbox code" });
    }
  });

  app.delete("/api/lockbox-codes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteLockboxCode(req.params.id);
      res.json({ message: "Code deleted" });
    } catch (error) {
      console.error("Error deleting lockbox code:", error);
      res.status(500).json({ message: "Failed to delete lockbox code" });
    }
  });

  app.post("/api/lockboxes/:lockboxId/assign-code", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const lockboxId = req.params.lockboxId;

      if (user.role !== "admin") {
        const reservations = await storage.getVehicleReservations();
        const now = new Date();
        const hasValidReservation = reservations.some((r: any) => {
          if (r.userId !== user.id) return false;
          if (r.lockboxId !== lockboxId) return false;
          if (r.status !== "approved") return false;
          const startTime = new Date(r.startDate).getTime();
          const oneHourBefore = startTime - 60 * 60 * 1000;
          return now.getTime() >= oneHourBefore && now.getTime() <= new Date(r.endDate).getTime();
        });

        if (!hasValidReservation) {
          return res.status(403).json({ message: "No valid reservation with this lockbox" });
        }
      }

      const code = await storage.assignRandomCode(lockboxId);
      if (!code) return res.status(404).json({ message: "No active codes available for this lockbox" });
      res.json(code);
    } catch (error) {
      console.error("Error assigning lockbox code:", error);
      res.status(500).json({ message: "Failed to assign lockbox code" });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const vehicles = await storage.getVehicles(status ? { status } : undefined);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, validated);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid vehicle data", errors: error.errors });
      }
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.patch("/api/vehicles/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const statusSchema = z.object({ status: z.string().min(1) });
      const { status } = statusSchema.parse(req.body);
      const vehicle = await storage.updateVehicleStatus(req.params.id, status);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle status:", error);
      res.status(500).json({ message: "Failed to update vehicle status" });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Vehicle reservation routes
  app.get("/api/vehicle-reservations/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const reservations = await storage.getVehicleReservations({ userId });

      const enriched = await Promise.all(reservations.map(async (r) => {
        if (!r.vehicleId) return { ...r, vehicleName: null, vehicleDisplayId: null };
        const vehicle = await storage.getVehicle(r.vehicleId);
        return {
          ...r,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
          vehicleDisplayId: vehicle ? vehicle.vehicleId : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching user's vehicle reservations:", error);
      res.status(500).json({ message: "Failed to fetch vehicle reservations" });
    }
  });

  app.get("/api/vehicle-reservations", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const userId = req.query.userId as string | undefined;
      const status = req.query.status as string | undefined;

      const reservations = await storage.getVehicleReservations({
        vehicleId,
        userId,
        status,
      });
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching vehicle reservations:", error);
      res.status(500).json({ message: "Failed to fetch vehicle reservations" });
    }
  });

  app.get("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const reservationId = req.params.id;
      const reservation = await storage.getVehicleReservation(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const currentUser = await storage.getUser(req.userId);
      const isPrivileged = currentUser?.role === "admin" || currentUser?.role === "technician";

      if (reservation.userId !== req.userId && !isPrivileged) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error fetching reservation:", error);
      res.status(500).json({ message: "Failed to fetch reservation" });
    }
  });

  app.post("/api/vehicle-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      // Convert date strings to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        userId, // Add userId from authenticated session
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };

      const reservationData = insertVehicleReservationSchema.parse(bodyWithDates);

      // Validate business rules
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startDate = new Date(reservationData.startDate);
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      // Rule 1: No past dates
      if (startDateOnly < today) {
        return res.status(400).json({ message: "Cannot create reservations for past dates" });
      }

      // Rule 3: If reservation is for tomorrow and it's after 4 PM today, start time must be >= 9:00 AM
      if (startDateOnly.getTime() === tomorrow.getTime()) {
        const currentHour = now.getHours();
        
        // Only enforce 9 AM restriction if it's after 4 PM today
        if (currentHour >= 16) {
          const startHour = startDate.getHours();
          const startMinute = startDate.getMinutes();
          const startTimeInMinutes = startHour * 60 + startMinute;
          const nineAMInMinutes = 9 * 60; // 9:00 AM = 540 minutes

          if (startTimeInMinutes < nineAMInMinutes) {
            return res.status(400).json({ 
              message: "After 4:00 PM, reservations for tomorrow must start at or after 9:00 AM" 
            });
          }
        }
      }

      // Validate end time is after start time
      if (reservationData.endDate <= reservationData.startDate) {
        return res.status(400).json({ message: "End date/time must be after start date/time" });
      }

      // If vehicleId is provided, check availability
      if (reservationData.vehicleId) {
        const isAvailable = await storage.checkVehicleAvailability(
          reservationData.vehicleId,
          reservationData.startDate,
          reservationData.endDate
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Vehicle is not available for the selected dates" });
        }
      }

      const reservation = await storage.createVehicleReservation(reservationData);

      // Auto-sync vehicle status
      if (reservationData.vehicleId) {
        await syncVehicleStatus(reservationData.vehicleId);
      }

      const requester = await storage.getUser(userId);
      if (requester) {
        const admins = await storage.getUsersByRoles(["admin"]);
        let vehicleName = "Unassigned";
        if (reservationData.vehicleId) {
          const vehicle = await storage.getVehicle(reservationData.vehicleId);
          if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        }
        notifyNewVehicleReservation(reservation, requester, admins, vehicleName, notificationService).catch(err =>
          console.error("Failed to send vehicle reservation notification emails:", err)
        );
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error creating vehicle reservation:", error);
      res.status(500).json({ message: "Failed to create vehicle reservation" });
    }
  });

  // Update vehicle reservation (PATCH endpoint)
  app.patch("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const validated = insertVehicleReservationSchema.partial().parse(req.body);
      const updates: any = { ...validated };

      const reservation = await storage.getVehicleReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // Only admin, technician, or the user who created the reservation can update it
      const canUpdate = 
        currentUser.role === "admin" || 
        currentUser.role === "technician" || 
        reservation.userId === userId;

      if (!canUpdate) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If staff is cancelling, reset lastViewedStatus so admin sees the update
      if (updates.status === "cancelled" && reservation.userId === userId) {
        updates.lastViewedStatus = reservation.status;
      }

      // If admin is editing, reset lastViewedStatus so user sees the update
      if ((currentUser.role === "admin" || currentUser.role === "technician") && 
          reservation.userId !== userId) {
        updates.lastViewedStatus = "pending"; // Force notification
      }

      // Enforce lockboxId consistency: if key_box method, require lockboxId; otherwise clear it
      const effectiveKeyPickup = updates.keyPickupMethod ?? reservation.keyPickupMethod;
      if (effectiveKeyPickup === "key_box") {
        const effectiveLockboxId = ("lockboxId" in updates) ? updates.lockboxId : reservation.lockboxId;
        if (!effectiveLockboxId) {
          return res.status(400).json({ message: "A lockbox must be selected when using Key Box pickup method" });
        }
      } else if (updates.keyPickupMethod && updates.keyPickupMethod !== "key_box") {
        updates.lockboxId = null;
      }

      // Only allow admin/technician to set lockboxId and handoff fields
      if (currentUser.role !== "admin" && currentUser.role !== "technician") {
        delete updates.lockboxId;
        delete updates.keyPickupMethod;
        delete updates.adminNotes;
      }

      // Handle potential vehicle status changes if vehicleId is updated
      const oldVehicleId = reservation.vehicleId;
      if (updates.vehicleId && updates.vehicleId !== reservation.vehicleId) {
        const isAvailable = await storage.checkVehicleAvailability(
          updates.vehicleId,
          reservation.startDate,
          reservation.endDate,
          id // Exclude current reservation from check
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Vehicle is not available for the selected dates" });
        }
      }

      const updatedReservation = await storage.updateVehicleReservation(id, updates);

      // Auto-sync vehicle statuses for both old and new vehicles
      if (oldVehicleId) {
        await syncVehicleStatus(oldVehicleId);
      }
      if (updates.vehicleId && updates.vehicleId !== oldVehicleId) {
        await syncVehicleStatus(updates.vehicleId);
      }
      // Also sync current vehicle if status changed
      if (updates.status && updatedReservation?.vehicleId && !updates.vehicleId) {
        await syncVehicleStatus(updatedReservation.vehicleId);
      }

      if (updates.status === "approved" && reservation.status !== "approved" && updatedReservation) {
        const reservationUser = await storage.getUser(reservation.userId);
        if (reservationUser) {
          let vehicleName = "Unassigned";
          const vId = updatedReservation.vehicleId || reservation.vehicleId;
          if (vId) {
            const vehicle = await storage.getVehicle(vId);
            if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          }
          notifyVehicleReservationApproved(updatedReservation, reservationUser, vehicleName, notificationService).catch(err =>
            console.error("Failed to send reservation approval email:", err)
          );
        }
      }

      if (updates.status === "cancelled" && reservation.status !== "cancelled" && updatedReservation && reservation.userId !== userId) {
        // Admin cancelled the reservation - notify the user
        const reservationUser = await storage.getUser(reservation.userId);
        if (reservationUser) {
          let vehicleName = "Unassigned";
          const vId = updatedReservation.vehicleId || reservation.vehicleId;
          if (vId) {
            const vehicle = await storage.getVehicle(vId);
            if (vehicle) vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          }
          notifyVehicleReservationDenied(updatedReservation, reservationUser, vehicleName, notificationService).catch(err =>
            console.error("Failed to send reservation denied email:", err)
          );
        }
      }

      res.json(updatedReservation);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid reservation data", errors: error.errors });
      }
      console.error("Error updating vehicle reservation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete vehicle reservation
  app.delete("/api/vehicle-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const reservation = await storage.getVehicleReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // Only admin or the user who created the reservation can delete it
      if (user.role !== "admin" && reservation.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If staff is cancelling, create a service request to notify admins
      if (user.role === "staff" && reservation.userId === user.id) {
        let vehicleInfo = "Unknown Vehicle";
        if (reservation.vehicleId) {
          const vehicle = await storage.getVehicle(reservation.vehicleId);
          if (vehicle) {
            vehicleInfo = `${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`;
          }
        }

        // Create a service request as notification
        await storage.createServiceRequest({
          title: `Vehicle Reservation Cancelled - ${vehicleInfo}`,
          description: `${user.firstName} ${user.lastName} has cancelled their vehicle reservation.\n\n` +
            `Vehicle: ${vehicleInfo}\n` +
            `Purpose: ${reservation.purpose}\n` +
            `Start Date: ${new Date(reservation.startDate).toLocaleString()}\n` +
            `End Date: ${new Date(reservation.endDate).toLocaleString()}\n` +
            `Passenger Count: ${reservation.passengerCount}\n\n` +
            `This is an informational notification only.`,
          urgency: "low",
          requesterId: user.id,
        });
      }

      const vehicleId = reservation.vehicleId;
      await storage.deleteVehicleReservation(id);

      // Auto-sync vehicle status after deletion
      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.status(204).send(); // No Content
    } catch (error: any) {
      console.error("Error deleting vehicle reservation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vehicle-reservations/:id/check-availability", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, vehicleId } = req.body;
      const isAvailable = await storage.checkVehicleAvailability(
        vehicleId,
        new Date(startDate),
        new Date(endDate),
        req.params.id
      );
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking vehicle availability:", error);
      res.status(500).json({ message: "Failed to check vehicle availability" });
    }
  });

  // Accept advisory for reservation
  app.post("/api/vehicle-reservations/:id/accept-advisory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const reservationId = req.params.id;

      const reservation = await storage.getVehicleReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // Only the reservation owner (or admin/technician) can accept the advisory
      const currentUser = await storage.getUser(userId);
      const isAdmin = currentUser?.role === "admin" || currentUser?.role === "technician";
      if (reservation.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateVehicleReservation(reservationId, {
        advisoryAccepted: true,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting advisory:", error);
      res.status(500).json({ message: "Failed to accept advisory" });
    }
  });

  // Mark reservation status as viewed
  app.post("/api/vehicle-reservations/:id/mark-viewed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const reservationId = req.params.id;

      const reservation = await storage.getVehicleReservation(reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // Only the reservation owner can mark it as viewed
      if (reservation.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateVehicleReservation(reservationId, {
        lastViewedStatus: reservation.status,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking reservation as viewed:", error);
      res.status(500).json({ message: "Failed to mark reservation as viewed" });
    }
  });

  // Vehicle check-out log routes
  app.get("/api/vehicle-checkout-logs", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const userId = req.query.userId as string | undefined;

      const logs = await storage.getVehicleCheckOutLogs({ vehicleId, userId });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching vehicle check-out logs:", error);
      res.status(500).json({ message: "Failed to fetch vehicle check-out logs" });
    }
  });

  app.get("/api/vehicle-checkout-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getVehicleCheckOutLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Check-out log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error fetching vehicle check-out log:", error);
      res.status(500).json({ message: "Failed to fetch vehicle check-out log" });
    }
  });

  app.post("/api/vehicle-checkout-logs", isAuthenticated, async (req: any, res) => {
    console.log("=== VEHICLE CHECKOUT REQUEST START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("User ID:", req.userId);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      
      // Clean and validate the data
      const cleanedBody = {
        ...req.body,
        startMileage: Number(req.body.startMileage) || 0,
        fuelLevel: req.body.fuelLevel || "full",
        cleanlinessConfirmed: Boolean(req.body.cleanlinessConfirmed),
        damageNotes: req.body.damageNotes || null,
        adminOverride: req.body.adminOverride === true ? true : undefined,
        assignedCodeId: req.body.assignedCodeId || null,
      };
      
      console.log("Cleaned body:", JSON.stringify(cleanedBody, null, 2));
      
      const logData = insertVehicleCheckOutLogSchema.parse(cleanedBody);
      console.log("Parsed log data:", JSON.stringify(logData, null, 2));

      // Verify reservation belongs to current user (admins/technicians can check out any)
      const reservation = await storage.getVehicleReservation(logData.reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      const checkoutUser = await storage.getUser(req.userId);
      const isCheckoutAdmin = checkoutUser?.role === "admin" || checkoutUser?.role === "technician";
      if (reservation.userId !== req.userId && !isCheckoutAdmin) {
        return res.status(403).json({ message: "Unauthorized: This reservation belongs to another user" });
      }
      if (reservation.vehicleId !== logData.vehicleId) {
        return res.status(400).json({ message: "Vehicle mismatch: This reservation is for a different vehicle" });
      }

      // Check if a checkout log already exists for this reservation
      const existingLog = await storage.getCheckOutLogByReservation(logData.reservationId);
      if (existingLog) {
        return res.status(400).json({ message: "A checkout log already exists for this reservation" });
      }

      console.log("Creating checkout log...");
      let log;
      try {
        log = await storage.createVehicleCheckOutLog(logData);
        console.log("Checkout log created:", log.id);
      } catch (dbError: any) {
        console.error("Error in createVehicleCheckOutLog:", dbError);
        // Preserve the original error with all its properties
        const error = new Error(`Failed to create checkout log: ${dbError.message || dbError.toString()}`);
        (error as any).code = dbError.code;
        (error as any).detail = dbError.detail;
        (error as any).hint = dbError.hint;
        (error as any).cause = dbError;
        throw error;
      }

      // Update vehicle status to in_use and mileage
      console.log("Updating vehicle status...");
      try {
        await storage.updateVehicleStatus(logData.vehicleId, "in_use");
        await storage.updateVehicleMileage(logData.vehicleId, logData.startMileage);
      } catch (updateError: any) {
        console.error("Error updating vehicle:", updateError);
        const error = new Error(`Failed to update vehicle: ${updateError.message || updateError.toString()}`);
        (error as any).code = updateError.code;
        (error as any).detail = updateError.detail;
        (error as any).hint = updateError.hint;
        (error as any).cause = updateError;
        throw error;
      }

      // Update reservation status to active
      console.log("Updating reservation status...");
      try {
        await storage.updateReservationStatus(logData.reservationId, "active");
      } catch (resError: any) {
        console.error("Error updating reservation:", resError);
        const error = new Error(`Failed to update reservation: ${resError.message || resError.toString()}`);
        (error as any).code = resError.code;
        (error as any).detail = resError.detail;
        (error as any).hint = resError.hint;
        (error as any).cause = resError;
        throw error;
      }

      console.log("=== CHECKOUT SUCCESS ===");
      console.log("Checkout log ID:", log.id);
      res.json(log);
    } catch (error: any) {
      console.error("=== CHECKOUT ERROR CAUGHT ===");
      console.error("Error type:", typeof error);
      console.error("Error is Error instance:", error instanceof Error);
      console.error("Error creating vehicle check-out log:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        errors: error?.errors,
        issues: error?.issues,
        cause: error?.cause,
        detail: error?.detail,
        hint: error?.hint,
      });
      
      // Handle Zod validation errors
      if (error?.name === "ZodError" || error?.issues) {
        const validationErrors = error.errors || error.issues || [];
        const errorMessages = validationErrors.map((e: any) => 
          `${e.path?.join('.') || 'field'}: ${e.message}`
        ).join('; ');
        
        return res.status(400).json({ 
          message: `Validation error: ${errorMessages}`,
          errors: validationErrors,
          details: error.message
        });
      }
      
      // Handle database errors (PostgreSQL error codes)
      if (error?.code) {
        const errorMessage = error.message || error.detail || "Database error occurred";
        return res.status(500).json({ 
          message: `${errorMessage}${error.hint ? ` (${error.hint})` : ''}`,
          code: error.code,
          hint: error.hint,
          detail: error.detail
        });
      }
      
      // Handle Drizzle ORM errors
      if (error?.cause) {
        const causeMessage = error.cause?.message || error.cause?.toString() || '';
        return res.status(500).json({ 
          message: causeMessage || error.message || "Failed to create vehicle check-out log",
          details: error.toString(),
          cause: error.cause
        });
      }
      
      // Generic error - include as much info as possible
      // Try multiple ways to extract the error message
      let errorMessage = "Failed to create vehicle check-out log";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      }
      
      // Log the full error for debugging
      console.error("=== FULL ERROR DEBUG ===");
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("Error constructor:", error?.constructor?.name);
      console.error("Error keys:", Object.keys(error || {}));
      console.error("Error message property:", error?.message);
      console.error("Error detail property:", error?.detail);
      console.error("Error code property:", error?.code);
      console.error("Error string representation:", String(error));
      console.error("========================");
      
      // Always return a response - don't let it fall through
      return res.status(500).json({ 
        message: errorMessage,
        error: String(error),
        type: error?.constructor?.name,
        originalMessage: error?.message,
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  });

  app.delete("/api/vehicle-checkout-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      // Get the log first to know the vehicle ID for syncing
      const log = await storage.getVehicleCheckOutLog(req.params.id);
      const vehicleId = log?.vehicleId;

      await storage.deleteVehicleCheckOutLog(req.params.id);

      // Auto-sync vehicle status after deletion
      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle check-out log:", error);
      res.status(500).json({ message: "Failed to delete vehicle check-out log" });
    }
  });

  // Vehicle check-in log routes
  app.get("/api/vehicle-checkin-logs", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const userId = req.query.userId as string | undefined;

      const logs = await storage.getVehicleCheckInLogs({ vehicleId, userId });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching vehicle check-in logs:", error);
      res.status(500).json({ message: "Failed to fetch vehicle check-in logs" });
    }
  });

  app.get("/api/vehicle-checkin-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getVehicleCheckInLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Check-in log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error fetching vehicle check-in log:", error);
      res.status(500).json({ message: "Failed to fetch vehicle check-in log" });
    }
  });

  app.post("/api/vehicle-checkin-logs", isAuthenticated, async (req: any, res) => {
    try {
      const logData = insertVehicleCheckInLogSchema.parse(req.body);

      // Verify check-out log belongs to current user
      const checkOutLog = await storage.getVehicleCheckOutLog(logData.checkOutLogId);
      if (!checkOutLog) {
        return res.status(404).json({ message: "Check-out log not found" });
      }
      if (checkOutLog.userId !== req.userId) {
        return res.status(403).json({ message: "Unauthorized: This check-out log belongs to another user" });
      }
      if (checkOutLog.vehicleId !== logData.vehicleId) {
        return res.status(400).json({ message: "Vehicle mismatch: This check-out was for a different vehicle" });
      }

      // Create the log with explicit date and fuel level values
      const logWithDefaults = {
        ...logData,
        checkInDate: new Date(),
        endFuelLevel: logData.fuelLevel ? parseInt(logData.fuelLevel) || 100 : 100,
      };
      const log = await storage.createVehicleCheckInLog(logWithDefaults as any);

      // Update vehicle mileage
      await storage.updateVehicleMileage(logData.vehicleId, logData.endMileage);

      // Determine new vehicle status — issues take priority over cleanliness
      let newStatus = "available";
      if (logData.issues && logData.issues.trim().length > 0) {
        newStatus = "needs_maintenance";
      } else if (logData.cleanlinessStatus === "needs_cleaning") {
        newStatus = "needs_cleaning";
      }

      await storage.updateVehicleStatus(logData.vehicleId, newStatus);

      // Update reservation status to pending_review — admin must verify before marking complete
      await storage.updateReservationStatus(checkOutLog.reservationId, "pending_review");

      // Auto-create maintenance task if mechanical issues reported
      if (logData.issues && logData.issues.trim().length > 0) {
        const userId = req.userId;
        const vehicle = await storage.getVehicle(logData.vehicleId);

        if (vehicle) {
          await storage.createTask({
            vehicleId: logData.vehicleId,
            name: `Maintenance Required: ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
            description: `Issues reported by user at check-in: ${logData.issues}\n\nCheck-in log ID: ${log.id}`,
            urgency: "high",
            initialDate: new Date(),
            taskType: "one_time",
            status: "not_started",
            createdById: userId,
          });
        }
      }

      res.json(log);
    } catch (error) {
      console.error("Error creating vehicle check-in log:", error);
      res.status(500).json({ message: "Failed to create vehicle check-in log" });
    }
  });

  app.patch("/api/vehicle-checkin-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const logData = insertVehicleCheckInLogSchema.partial().parse(req.body);
      const log = await storage.updateVehicleCheckInLog(req.params.id, logData);
      if (!log) {
        return res.status(404).json({ message: "Check-in log not found" });
      }

      // If mileage was updated, update vehicle mileage too
      if (logData.endMileage) {
        await storage.updateVehicleMileage(log.vehicleId, logData.endMileage);
      }

      // Auto-sync vehicle status
      await syncVehicleStatus(log.vehicleId);

      res.json(log);
    } catch (error) {
      console.error("Error updating vehicle check-in log:", error);
      res.status(500).json({ message: "Failed to update vehicle check-in log" });
    }
  });

  app.delete("/api/vehicle-checkin-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      // Get the log first to know the vehicle ID for syncing
      const log = await storage.getVehicleCheckInLog(req.params.id);
      const vehicleId = log?.vehicleId;

      await storage.deleteVehicleCheckInLog(req.params.id);

      // Auto-sync vehicle status after deletion
      if (vehicleId) {
        await syncVehicleStatus(vehicleId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle check-in log:", error);
      res.status(500).json({ message: "Failed to delete vehicle check-in log" });
    }
  });

  // Sync vehicle statuses (admin only) - fixes vehicles stuck in incorrect state
  app.post("/api/vehicles/sync-statuses", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allVehicles = await storage.getVehicles();
      let updatedCount = 0;

      for (const vehicle of allVehicles) {
        const oldStatus = vehicle.status;
        await syncVehicleStatus(vehicle.id);
        
        // Check if status changed
        const updatedVehicle = await storage.getVehicle(vehicle.id);
        if (updatedVehicle && updatedVehicle.status !== oldStatus) {
          updatedCount++;
        }
      }

      res.json({ 
        success: true, 
        message: `Synced all vehicles. ${updatedCount} vehicle(s) had their status updated.` 
      });
    } catch (error) {
      console.error("Error syncing vehicle statuses:", error);
      res.status(500).json({ message: "Failed to sync vehicle statuses" });
    }
  });

  // Vehicle maintenance schedules
  app.get("/api/vehicle-maintenance-schedules", isAuthenticated, async (req, res) => {
    try {
      const vehicleId = req.query.vehicleId as string | undefined;
      const schedules = await storage.getVehicleMaintenanceSchedules(vehicleId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching vehicle maintenance schedules:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance schedules" });
    }
  });

  // Vehicle maintenance logs
  app.get("/api/vehicles/:id/maintenance-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getVehicleMaintenanceLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching vehicle maintenance logs:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance logs" });
    }
  });

  app.post("/api/vehicles/:id/maintenance-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const logData = insertVehicleMaintenanceLogSchema.parse({
        ...req.body,
        vehicleId: req.params.id,
      });
      const log = await storage.createVehicleMaintenanceLog(logData);

      // If a mileage is provided, update the vehicle's current mileage
      if (log.mileageAtMaintenance) {
        await storage.updateVehicleMileage(req.params.id, log.mileageAtMaintenance);
      }

      res.json(log);
    } catch (error) {
      console.error("Error creating vehicle maintenance log:", error);
      res.status(500).json({ message: "Failed to create vehicle maintenance log" });
    }
  });

  app.delete("/api/vehicle-maintenance-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleMaintenanceLog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle maintenance log:", error);
      res.status(500).json({ message: "Failed to delete vehicle maintenance log" });
    }
  });

  app.get("/api/vehicle-maintenance-schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getVehicleMaintenanceSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to fetch vehicle maintenance schedule" });
    }
  });

  app.post("/api/vehicle-maintenance-schedules", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const scheduleData = insertVehicleMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createVehicleMaintenanceSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to create vehicle maintenance schedule" });
    }
  });

  app.patch("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleMaintenanceScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateVehicleMaintenanceSchedule(req.params.id, validated);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      console.error("Error updating vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to update vehicle maintenance schedule" });
    }
  });

  app.delete("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleMaintenanceSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to delete vehicle maintenance schedule" });
    }
  });

  // Vehicle Documents (Insurance, Registration, Inspection, etc.)
  app.get("/api/vehicles/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getVehicleDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching vehicle documents:", error);
      res.status(500).json({ message: "Failed to fetch vehicle documents" });
    }
  });

  app.get("/api/vehicle-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getVehicleDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching vehicle document:", error);
      res.status(500).json({ message: "Failed to fetch vehicle document" });
    }
  });

  app.post("/api/vehicles/:id/documents", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const documentData = insertVehicleDocumentSchema.parse({
        ...req.body,
        vehicleId: req.params.id,
        expirationDate: new Date(req.body.expirationDate),
      });
      const document = await storage.createVehicleDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error("Error creating vehicle document:", error);
      res.status(500).json({ message: "Failed to create vehicle document" });
    }
  });

  app.patch("/api/vehicle-documents/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertVehicleDocumentSchema.partial().parse(req.body);
      const updateData: any = { ...validated };
      if (updateData.expirationDate && typeof updateData.expirationDate === 'string') {
        updateData.expirationDate = new Date(updateData.expirationDate);
      }
      const document = await storage.updateVehicleDocument(req.params.id, updateData);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      console.error("Error updating vehicle document:", error);
      res.status(500).json({ message: "Failed to update vehicle document" });
    }
  });

  app.delete("/api/vehicle-documents/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle document:", error);
      res.status(500).json({ message: "Failed to delete vehicle document" });
    }
  });

  // Get documents expiring within specified days (for reminders)
  app.get("/api/vehicle-documents/expiring/:days", isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const expiringDocuments = await storage.getExpiringDocuments(days);
      res.json(expiringDocuments);
    } catch (error) {
      console.error("Error fetching expiring documents:", error);
      res.status(500).json({ message: "Failed to fetch expiring documents" });
    }
  });

  // Mark document reminder as sent
  app.post("/api/vehicle-documents/:id/mark-reminder-sent", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const document = await storage.markDocumentReminderSent(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error marking document reminder as sent:", error);
      res.status(500).json({ message: "Failed to mark document reminder as sent" });
    }
  });

  // Checklist Templates
  app.get("/api/checklist-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.get("/api/checklist-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getChecklistTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching checklist template:", error);
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  app.post("/api/checklist-templates", isAuthenticated, requireStaffOrHigher, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const templateData = insertChecklistTemplateSchema.parse({
        ...req.body,
        createdById: userId,
      });
      const template = await storage.createChecklistTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating checklist template:", error);
      res.status(500).json({ message: "Failed to create checklist template" });
    }
  });

  app.patch("/api/checklist-templates/:id", isAuthenticated, requireStaffOrHigher, async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        items: z.array(z.object({
          text: z.string(),
          sortOrder: z.number().optional(),
        })).optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      
      const template = await storage.updateChecklistTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating checklist template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteChecklistTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ message: "Failed to delete checklist template" });
    }
  });

  // Analytics Routes
  const { analyticsService } = await import("./analyticsService");

  app.get("/api/analytics/work-orders", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        technicianId: req.query.technicianId as string | undefined,
        status: req.query.status as string | undefined,
        urgency: req.query.urgency as string | undefined,
      };
      const data = await analyticsService.getWorkOrderOverview(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching work order analytics:", error);
      res.status(500).json({ message: "Failed to fetch work order analytics" });
    }
  });

  app.get("/api/analytics/technicians", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        roleType: req.query.roleType as "all" | "technician" | "student" | undefined,
      };
      const data = await analyticsService.getTechnicianPerformance(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching team performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch team performance analytics" });
    }
  });

  app.get("/api/analytics/assets", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        equipmentId: req.query.equipmentId as string | undefined,
      };
      const data = await analyticsService.getAssetHealth(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching asset analytics:", error);
      res.status(500).json({ message: "Failed to fetch asset analytics" });
    }
  });

  app.get("/api/analytics/facilities", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
      const data = await analyticsService.getFacilityInsights(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching facility analytics:", error);
      res.status(500).json({ message: "Failed to fetch facility analytics" });
    }
  });

  app.get("/api/analytics/alerts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
      const data = await analyticsService.getAlerts(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/analytics/trends", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
      };
      const data = await analyticsService.getWorkOrderTrends(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  app.get("/api/analytics/fleet", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const data = await analyticsService.getFleetOverview(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching fleet analytics:", error);
      res.status(500).json({ message: "Failed to fetch fleet analytics" });
    }
  });

  app.get("/api/analytics/service-requests", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        areaId: req.query.areaId as string | undefined,
        urgency: req.query.urgency as string | undefined,
      };
      const data = await analyticsService.getServiceRequestOverview(filters);
      res.json(data);
    } catch (error) {
      console.error("Error fetching service request analytics:", error);
      res.status(500).json({ message: "Failed to fetch service request analytics" });
    }
  });

  app.get("/api/analytics/export", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { type, format, ...filters } = req.query;
      const dataType = type as string;

      if (!dataType) {
        return res.status(400).json({ message: "Data type is required" });
      }

      const data = await analyticsService.getExportData(dataType, filters);

      if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.xlsx`);
        return res.send(buffer);
      } else if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        
        const doc = new jsPDF();
        doc.text(`Analytics Report: ${dataType}`, 14, 15);
        autoTable(doc, {
          head: [data.headers],
          body: data.data,
          startY: 20,
        });
        
        const buffer = Buffer.from(doc.output("arraybuffer"));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.pdf`);
        return res.send(buffer);
      }

      // Default back to CSV if no format or invalid format
      const csv = await analyticsService.exportData(dataType, filters);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=report-${dataType}-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // ===================== Emergency Contact Routes =====================
  
  // Get all emergency contacts (admin only)
  app.get("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contacts = await storage.getEmergencyContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ message: "Failed to fetch emergency contacts" });
    }
  });

  // Get active emergency contact (all authenticated users)
  app.get("/api/emergency-contacts/active", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getActiveEmergencyContact();
      res.json(contact || null);
    } catch (error) {
      console.error("Error fetching active emergency contact:", error);
      res.status(500).json({ message: "Failed to fetch active emergency contact" });
    }
  });

  // Get single emergency contact (admin only)
  app.get("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.getEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching emergency contact:", error);
      res.status(500).json({ message: "Failed to fetch emergency contact" });
    }
  });

  // Create emergency contact (admin only)
  app.post("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertEmergencyContactSchema.parse({
        ...req.body,
        assignedById: req.userId,
      });
      
      const contact = await storage.createEmergencyContact(validatedData);
      res.status(201).json(contact);
    } catch (error: any) {
      console.error("Error creating emergency contact:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create emergency contact" });
    }
  });

  // Update emergency contact (admin only)
  app.patch("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertEmergencyContactSchema.partial().parse(req.body);
      const contact = await storage.updateEmergencyContact(req.params.id, validated);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      console.error("Error updating emergency contact:", error);
      res.status(500).json({ message: "Failed to update emergency contact" });
    }
  });

  // Set a contact as active (admin only)
  app.post("/api/emergency-contacts/:id/activate", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.setActiveEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error activating emergency contact:", error);
      res.status(500).json({ message: "Failed to activate emergency contact" });
    }
  });

  // Clear active contact (admin only)
  app.post("/api/emergency-contacts/clear-active", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.clearActiveEmergencyContact();
      res.json({ message: "Active emergency contact cleared" });
    } catch (error) {
      console.error("Error clearing active emergency contact:", error);
      res.status(500).json({ message: "Failed to clear active emergency contact" });
    }
  });

  // Delete emergency contact (admin only)
  app.delete("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmergencyContact(req.params.id);
      res.json({ message: "Emergency contact deleted" });
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ message: "Failed to delete emergency contact" });
    }
  });

  // ============== NOTIFICATIONS ==============

  // Get all notifications for current user
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const notifications = await storage.getNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await storage.markAllNotificationsRead(user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Dismiss notification
  app.post("/api/notifications/:id/dismiss", isAuthenticated, async (req, res) => {
    try {
      await storage.dismissNotification(req.params.id);
      res.json({ message: "Notification dismissed" });
    } catch (error) {
      console.error("Error dismissing notification:", error);
      res.status(500).json({ message: "Failed to dismiss notification" });
    }
  });

  // Dismiss all notifications
  app.post("/api/notifications/dismiss-all", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await storage.dismissAllNotifications(user.id);
      res.json({ message: "All notifications dismissed" });
    } catch (error) {
      console.error("Error dismissing all notifications:", error);
      res.status(500).json({ message: "Failed to dismiss all notifications" });
    }
  });

  // ============== PROJECT MANAGEMENT ==============

  // Get all projects
  app.get("/api/projects", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, createdById } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (createdById) filters.createdById = createdById as string;
      
      const projectList = await storage.getProjects(filters);
      res.json(projectList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get single project
  app.get("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create project
  app.post("/api/projects", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      const body = { ...req.body };
      if (body.startDate && typeof body.startDate === "string") {
        body.startDate = new Date(body.startDate);
      }
      if (body.targetEndDate && typeof body.targetEndDate === "string") {
        body.targetEndDate = new Date(body.targetEndDate);
      }
      const data = insertProjectSchema.parse({
        ...body,
        createdById: userId,
      });
      
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const rawBody = { ...req.body };
      if (rawBody.startDate && typeof rawBody.startDate === "string") {
        rawBody.startDate = new Date(rawBody.startDate);
      }
      if (rawBody.targetEndDate && typeof rawBody.targetEndDate === "string") {
        rawBody.targetEndDate = new Date(rawBody.targetEndDate);
      }
      const validated = insertProjectSchema.partial().parse(rawBody);
      const body: any = { ...validated };
      const project = await storage.updateProject(req.params.id, body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Get tasks by project
  app.get("/api/projects/:id/tasks", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const tasksList = await storage.getTasksByProject(req.params.id);
      res.json(tasksList);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  // ============== PROJECT TEAM MEMBERS ==============

  // Get project team members
  app.get("/api/projects/:id/team", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const members = await storage.getProjectTeamMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Add team member to project
  app.post("/api/projects/:id/team", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertProjectTeamMemberSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });
      const member = await storage.addProjectTeamMember(data);
      res.status(201).json(member);
    } catch (error: any) {
      console.error("Error adding team member:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // Update team member
  app.patch("/api/project-team-members/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertProjectTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateProjectTeamMember(req.params.id, validated);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Remove team member
  app.delete("/api/project-team-members/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.removeProjectTeamMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // ============== PROJECT VENDORS ==============

  // Get project vendors
  app.get("/api/projects/:id/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorList = await storage.getProjectVendors(req.params.id);
      res.json(vendorList);
    } catch (error) {
      console.error("Error fetching project vendors:", error);
      res.status(500).json({ message: "Failed to fetch project vendors" });
    }
  });

  // Add vendor to project
  app.post("/api/projects/:id/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertProjectVendorSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });
      const vendor = await storage.addProjectVendor(data);
      res.status(201).json(vendor);
    } catch (error: any) {
      console.error("Error adding project vendor:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add vendor to project" });
    }
  });

  // Update project vendor
  app.patch("/api/project-vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertProjectVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateProjectVendor(req.params.id, validated);
      if (!vendor) {
        return res.status(404).json({ message: "Project vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      console.error("Error updating project vendor:", error);
      res.status(500).json({ message: "Failed to update project vendor" });
    }
  });

  // Remove vendor from project
  app.delete("/api/project-vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.removeProjectVendor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project vendor:", error);
      res.status(500).json({ message: "Failed to remove vendor" });
    }
  });

  // ============== QUOTES (Internal Estimates) ==============

  // Get all quotes / Get quotes by task ID
  app.get("/api/quotes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { taskId, status } = req.query;
      const filters: any = {};
      if (taskId) filters.taskId = taskId as string;
      if (status) filters.status = status as string;
      
      const quoteList = await storage.getQuotes(filters);
      res.json(quoteList);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Get quotes by task ID
  app.get("/api/tasks/:taskId/quotes", isAuthenticated, async (req, res) => {
    try {
      const quotes = await storage.getQuotesByTaskId(req.params.taskId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching task quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Get single quote
  app.get("/api/quotes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Create quote (internal estimate)
  app.post("/api/quotes", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Technicians can only create quotes for tasks assigned to them
      if (user.role === "technician" && req.body.taskId) {
        const hasAccess = await canAccessTask(user.id, req.body.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "You can only add estimates to tasks assigned to you" });
        }
      }
      
      const data = insertQuoteSchema.parse({
        ...req.body,
        createdById: user.id,
      });
      
      const quote = await storage.createQuote(data);
      
      // If a task requires estimate, update its estimate status AND task status
      if (req.body.taskId) {
        const task = await storage.getTask(req.body.taskId);
        if (task && task.requiresEstimate && task.estimateStatus === "needs_estimate") {
          await storage.updateTask(req.body.taskId, {
            estimateStatus: "waiting_approval",
            status: "waiting_approval",
          });
        }
      }
      
      res.status(201).json(quote);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // Update quote
  app.patch("/api/quotes/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only edit your own estimates" });
      }

      // Technicians can only update safe fields, not status or taskId
      const validated = insertQuoteSchema.partial().parse(req.body);
      let updateData: any = validated;
      if (user.role === "technician") {
        const { status, taskId, createdById, ...safeFields } = updateData;
        updateData = safeFields;
      }

      const updated = await storage.updateQuote(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      }
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Approve quote (marks others as rejected, updates task status)
  app.post("/api/quotes/:id/approve", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Update this quote to approved
      const approvedQuote = await storage.updateQuote(req.params.id, { status: "approved" });

      // Reject all other quotes for this task
      const taskQuotes = await storage.getQuotesByTaskId(quote.taskId);
      for (const q of taskQuotes) {
        if (q.id !== req.params.id && q.status !== "rejected") {
          await storage.updateQuote(q.id, { status: "rejected" });
        }
      }

      const currentTask = await storage.getTask(quote.taskId);
      const keepStatus = currentTask && (currentTask.status === "in_progress" || currentTask.status === "on_hold")
        ? currentTask.status
        : "not_started";
      const updatedQuoteTask = await storage.updateTask(quote.taskId, {
        status: keepStatus,
        estimateStatus: "approved",
        approvedQuoteId: req.params.id,
      });

      if (updatedQuoteTask?.projectId) {
        await syncProjectStatusFromTasks(updatedQuoteTask.projectId);
      }

      res.json(approvedQuote);
    } catch (error) {
      console.error("Error approving quote:", error);
      res.status(500).json({ message: "Failed to approve quote" });
    }
  });

  // Reject quote (admin only - sends task back for new estimates if all rejected)
  app.post("/api/quotes/:id/reject", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (quote.status === "approved") {
        return res.status(400).json({ message: "Cannot reject an already approved estimate" });
      }

      if (quote.status === "rejected") {
        return res.status(400).json({ message: "Estimate is already rejected" });
      }

      const rejectedQuote = await storage.updateQuote(req.params.id, { status: "rejected" });

      const taskQuotes = await storage.getQuotesByTaskId(quote.taskId);
      const allRejected = taskQuotes.every(q => q.id === req.params.id ? true : q.status === "rejected");

      if (allRejected) {
        await storage.updateTask(quote.taskId, {
          estimateStatus: "needs_estimate",
          status: "in_progress",
        });
      }

      res.json(rejectedQuote);
    } catch (error) {
      console.error("Error rejecting quote:", error);
      res.status(500).json({ message: "Failed to reject quote" });
    }
  });

  // Delete quote
  app.delete("/api/quotes/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only delete your own estimates" });
      }

      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // ============== QUOTE ATTACHMENTS ==============

  // Get quote attachments
  app.get("/api/quotes/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const attachments = await storage.getQuoteAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching quote attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  // Create quote attachment
  app.post("/api/quotes/:id/attachments", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only add attachments to your own estimates" });
      }

      const attachment = await storage.createQuoteAttachment({
        quoteId: req.params.id,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
        fileSize: req.body.fileSize,
        storageUrl: req.body.storageUrl,
      });
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating quote attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  // Delete quote attachment
  app.delete("/api/quote-attachments/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const attachment = await storage.getQuoteAttachment(req.params.id);
      if (!attachment) return res.status(404).json({ message: "Attachment not found" });

      const quote = await storage.getQuote(attachment.quoteId);
      if (user.role === "technician" && quote && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only delete attachments from your own estimates" });
      }

      await storage.deleteQuoteAttachment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // ============== PROJECT ANALYTICS ==============

  // Get project analytics
  app.get("/api/projects/:id/analytics", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get project tasks
      const projectTasks = await storage.getTasksByProject(projectId);
      
      // Calculate task stats
      const taskStats = {
        total: projectTasks.length,
        completed: projectTasks.filter(t => t.status === "completed").length,
        inProgress: projectTasks.filter(t => t.status === "in_progress").length,
        notStarted: projectTasks.filter(t => t.status === "not_started").length,
        onHold: projectTasks.filter(t => t.status === "on_hold").length,
      };

      // Get team members
      const team = await storage.getProjectTeamMembers(projectId);
      
      // Get project vendors
      const vendorLinks = await storage.getProjectVendors(projectId);

      // Calculate quote totals from task-based quotes
      let quotedAmount = 0;
      let totalQuotes = 0;
      let approvedQuotes = 0;
      let draftQuotes = 0;

      // Calculate actual costs from parts used on project tasks
      let actualPartsCost = 0;
      let totalTimeMinutes = 0;
      
      for (const task of projectTasks) {
        const parts = await storage.getPartsByTask(task.id);
        actualPartsCost += parts.reduce((sum, p) => sum + (p.cost || 0), 0);
        
        const timeEntries = await storage.getTimeEntriesByTask(task.id);
        totalTimeMinutes += timeEntries.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
        
        // Get quotes for this task
        const taskQuotes = await storage.getQuotesByTaskId(task.id);
        totalQuotes += taskQuotes.length;
        approvedQuotes += taskQuotes.filter(q => q.status === "approved").length;
        draftQuotes += taskQuotes.filter(q => q.status === "draft").length;
        quotedAmount += taskQuotes.filter(q => q.status === "approved").reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
      }

      res.json({
        project,
        taskStats,
        teamCount: team.length,
        vendorCount: vendorLinks.length,
        budget: {
          allocated: project.budgetAmount || 0,
          quoted: quotedAmount,
          actualParts: actualPartsCost,
          remaining: (project.budgetAmount || 0) - actualPartsCost - quotedAmount,
        },
        time: {
          totalMinutes: totalTimeMinutes,
          totalHours: Math.round(totalTimeMinutes / 60 * 10) / 10,
        },
        quotes: {
          total: totalQuotes,
          approved: approvedQuotes,
          pending: draftQuotes,
        },
      });
    } catch (error) {
      console.error("Error fetching project analytics:", error);
      res.status(500).json({ message: "Failed to fetch project analytics" });
    }
  });

  // ============== EMAIL MANAGEMENT ==============

  app.get("/api/email-templates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, trigger, subject, body } = req.body;
      if (!name || !trigger || !subject || !body) {
        return res.status(400).json({ message: "name, trigger, subject, and body are required" });
      }
      const TRIGGER_VARIABLES: Record<string, string[]> = {
        new_service_request: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
        new_vehicle_reservation: ["{{requester_name}}", "{{vehicle_name}}", "{{purpose}}", "{{start_date}}", "{{end_date}}"],
        vehicle_reservation_approved: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{purpose}}"],
        vehicle_reservation_denied: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{requester_name}}"],
        task_created: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
        task_assigned: ["{{request_title}}", "{{request_description}}", "{{urgency}}"],
        status_change: ["{{request_title}}", "{{status_message}}", "{{old_status}}", "{{new_status}}"],
        task_reminder: ["{{task_name}}", "{{task_status}}", "{{due_date}}"],
        document_expiration: ["{{document_name}}", "{{vehicle_name}}", "{{expiration_date}}"],
      };
      const template = await storage.createEmailTemplate({
        type: `custom_${Date.now()}`,
        trigger,
        name,
        subject,
        body,
        availableVariables: TRIGGER_VARIABLES[trigger] || [],
        isCustom: true,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const emailTemplateUpdateSchema = z.object({
        subject: z.string().optional(),
        body: z.string().optional(),
        name: z.string().optional(),
      });
      const { subject, body, name } = emailTemplateUpdateSchema.parse(req.body);
      const template = await storage.updateEmailTemplate(req.params.id, { subject, body, name });
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (!template.isCustom) {
        return res.status(403).json({ message: "Cannot delete built-in templates" });
      }
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  app.get("/api/email-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { templateType, status, search } = req.query;
      const logs = await storage.getEmailLogs({
        templateType: templateType as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  app.get("/api/notification-settings", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.patch("/api/notification-settings/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const notifSettingSchema = z.object({
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
      });
      const { emailEnabled, inAppEnabled } = notifSettingSchema.parse(req.body);
      const setting = await storage.updateNotificationSetting(req.params.id, { emailEnabled, inAppEnabled });
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error updating notification setting:", error);
      res.status(500).json({ message: "Failed to update notification setting" });
    }
  });

  // ─── Availability Schedules ──────────────────────────────────────────────
  app.get("/api/users/:id/availability", isAuthenticated, async (req, res) => {
    try {
      const schedules = await storage.getUserAvailability(req.params.id);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.put("/api/users/:id/availability", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules)) return res.status(400).json({ message: "schedules must be an array" });
      const parsed = schedules.map((s: any) => insertAvailabilityScheduleSchema.parse({ ...s, userId: req.params.id }));
      const result = await storage.upsertUserAvailability(req.params.id, parsed);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update availability" });
    }
  });

  // ─── User Skills ──────────────────────────────────────────────────────────
  app.get("/api/users/:id/skills", isAuthenticated, async (req, res) => {
    try {
      const skills = await storage.getUserSkills(req.params.id);
      res.json(skills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  app.post("/api/users/:id/skills", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertUserSkillSchema.parse({ ...req.body, userId: req.params.id });
      const skill = await storage.createUserSkill(data);
      res.status(201).json(skill);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create skill" });
    }
  });

  app.delete("/api/users/:id/skills/:skillId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteUserSkill(req.params.skillId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete skill" });
    }
  });

  // ─── Task Dependencies ────────────────────────────────────────────────────
  app.get("/api/tasks/:id/dependencies", isAuthenticated, async (req, res) => {
    try {
      const deps = await storage.getTaskDependencies(req.params.id);
      res.json(deps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dependencies" });
    }
  });

  app.post("/api/tasks/:id/dependencies", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertTaskDependencySchema.parse({ ...req.body, taskId: req.params.id });
      const dep = await storage.createTaskDependency(data);
      res.status(201).json(dep);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create dependency" });
    }
  });

  app.delete("/api/tasks/:id/dependencies/:depId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTaskDependency(req.params.depId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dependency" });
    }
  });

  // ─── SLA Configs ──────────────────────────────────────────────────────────
  app.get("/api/sla-configs", isAuthenticated, async (req, res) => {
    try {
      const configs = await storage.getSlaConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SLA configs" });
    }
  });

  app.put("/api/sla-configs/:urgencyLevel", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { responseHours, resolutionHours } = req.body;
      if (typeof responseHours !== "number" || typeof resolutionHours !== "number") {
        return res.status(400).json({ message: "responseHours and resolutionHours must be numbers" });
      }
      const config = await storage.upsertSlaConfig(req.params.urgencyLevel, { responseHours, resolutionHours });
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update SLA config" });
    }
  });

  // ─── AI Agent Logs ────────────────────────────────────────────────────────
  app.get("/api/ai-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, entityType, limit } = req.query;
      const logs = await storage.getAiAgentLogs({
        status: status as string,
        entityType: entityType as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI logs" });
    }
  });

  app.patch("/api/ai-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const aiLogSchema = z.object({ status: z.enum(["approved", "rejected"]) });
      const { status } = aiLogSchema.parse(req.body);
      const log = await storage.updateAiAgentLog(req.params.id, { status, reviewedBy: user.id });
      if (!log) return res.status(404).json({ message: "Log not found" });

      if (status === "approved") {
        const { aiAgent } = await import("./aiAgent");
        await aiAgent.applyApprovedAction(log);
      }

      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update AI log" });
    }
  });

  // ─── AI Triage trigger ────────────────────────────────────────────────────
  app.post("/api/ai/triage/:requestId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const request = await storage.getServiceRequest(req.params.requestId);
      if (!request) return res.status(404).json({ message: "Request not found" });
      const { aiAgent } = await import("./aiAgent");
      const log = await aiAgent.triageServiceRequest(request);
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to run AI triage" });
    }
  });

  // ─── AI Schedule suggestion ───────────────────────────────────────────────
  app.post("/api/ai/schedule/:taskId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const { aiAgent } = await import("./aiAgent");
      const log = await aiAgent.suggestTaskSchedule(task);
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate schedule suggestion" });
    }
  });

  // ─── AI Project schedule ──────────────────────────────────────────────────
  app.post("/api/ai/project-schedule/:projectId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const { aiAgent } = await import("./aiAgent");
      const logs = await aiAgent.scheduleProject(req.params.projectId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate project schedule" });
    }
  });

  // ─── Equipment PM schedule ────────────────────────────────────────────────
  app.get("/api/equipment/:id/pm-schedule", isAuthenticated, async (req, res) => {
    try {
      const eq = await storage.getEquipmentItem(req.params.id);
      if (!eq) return res.status(404).json({ message: "Equipment not found" });
      const allTasks = await storage.getTasks();
      const tasks = allTasks.filter((t: any) => t.equipmentId === req.params.id);
      const completedTasks = tasks.filter((t: any) => t.status === "completed");
      completedTasks.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      const lastCompleted = completedTasks[0];
      const intervalDays = (eq as any).maintenanceIntervalDays || 90;
      const projectedDates: string[] = [];
      const baseDate = lastCompleted?.updatedAt ? new Date(lastCompleted.updatedAt) : new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + intervalDays * i);
        projectedDates.push(d.toISOString());
      }
      res.json({ equipmentId: req.params.id, intervalDays, lastCompleted: lastCompleted?.updatedAt || null, projectedDates });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PM schedule" });
    }
  });

  // ─── AI Stats ─────────────────────────────────────────────────────────────
  app.get("/api/ai-stats", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allLogs = await storage.getAiAgentLogs({});
      const pending = allLogs.filter((l: any) => l.status === "pending_review").length;
      const approved = allLogs.filter((l: any) => l.status === "approved").length;
      const rejected = allLogs.filter((l: any) => l.status === "rejected").length;
      const autoApplied = allLogs.filter((l: any) => l.status === "auto_applied").length;
      const total = allLogs.length;
      const acceptanceRate = (approved + autoApplied) > 0 ? Math.round(((approved + autoApplied) / Math.max(total - pending, 1)) * 100) : 0;
      res.json({ pending, approved, rejected, autoApplied, total, acceptanceRate });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}