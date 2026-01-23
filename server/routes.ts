import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, getCurrentUser, requireAdmin, requireStaffOrHigher, requireRequestAccess, requireTaskExecutorOrAdmin, requireTaskAccess, canAccessTask } from "./middleware";
import bcrypt from "bcryptjs";

import { seedDatabase } from "./seed";
import { notificationService, notifyTaskCreated, notifyStatusChange, notifyTaskAssigned } from "./notifications";
import {
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
  insertQuoteItemSchema,
} from "@shared/schema";
import { z } from "zod";

// Helper function to get authenticated user
async function getAuthUser(req: any) {
  if (!req.isAuthenticated()) {
    return null;
  }
  try {
    const userId = req.userId;
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

// Placeholder for authenticateUser function (assuming it exists elsewhere)
async function authenticateUser(req: any): Promise<any | null> {
  // This is a placeholder. Replace with your actual authentication logic.
  // It should verify the user's session and return user information if authenticated.
  if (req.isAuthenticated()) {
    try {
      const user = await storage.getUser(req.userId);
      if (user) {
        return { ...user, role: user.role }; // Ensure role is included
      }
    } catch (error) {
      console.error("Error during authenticateUser:", error);
    }
  }
  return null;
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed database with default areas
  await seedDatabase();

  // Login endpoint
  app.post("/api/login", async (req, res) => {
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
        req.login(newAdmin, (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
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
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
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
  app.post("/api/logout", isAuthenticated, (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  // Forgot username endpoint
  app.post("/api/auth/forgot-username", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (user && user.email) {
        await notificationService.sendEmail(
          user.email,
          "Username Recovery",
          `Your username is: ${user.username}\n\nIf you didn't request this, please contact support.`
        );
      }

      res.json({ success: true, message: "If an account exists with this email, the username has been sent." });
    } catch (error) {
      console.error("Forgot username error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (user && user.email) {
        // Generate a temporary reset token (in production, store this in DB with expiry)
        const resetToken = Math.random().toString(36).substring(2, 15);
        const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

        await notificationService.sendEmail(
          user.email,
          "Password Reset Request",
          `You have requested to reset your password.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.`
        );
      }

      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
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
      const { role } = req.body;

      // Validate role value
      if (!["admin", "technician", "staff", "student"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, phoneNumber, firstName, lastName } = req.body;

      const user = await storage.updateUser(id, {
        username,
        email,
        phoneNumber,
        firstName,
        lastName,
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      res.status(500).json({ message: "Failed to update user" });
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
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.updateUserPassword(id, hashedPassword);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
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

      const { firstName, lastName, email, phoneNumber } = req.body;
      const updatedUser = await storage.updateUser(targetId, {
        firstName,
        lastName,
        email,
        phoneNumber,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password (self-service for all authenticated users)
  app.post("/api/users/change-password", isAuthenticated, async (req: any, res) => {
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
      const { change } = req.body;
      if (typeof change !== 'number') {
        return res.status(400).json({ message: "Quantity change must be a number" });
      }
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
      if (currentUser?.role === "staff") {
        filters.userId = userId; // Only see own requests
      }
      // Admin and maintenance see all requests

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

        // Staff can only view their own requests, admin and maintenance can view all
        if (currentUser?.role === "staff" && request.requesterId !== userId) {
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
      });
      const request = await storage.createServiceRequest(requestData);
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

      const updatedRequest = await storage.updateServiceRequest(req.params.id, req.body);
      res.json(updatedRequest);
    } catch (error) {
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
        const { status, rejectionReason } = req.body;

        const request = await storage.updateServiceRequestStatus(
          req.params.id,
          status,
          rejectionReason
        );

        res.json(request);
      } catch (error) {
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

      // Role-based filtering
      if (currentUser.role === "student") {
        // Students only see tasks directly assigned to them
        filters.assignedToId = userId;
      } else if (currentUser.role === "technician") {
        // Technicians only see tasks directly assigned to them
        filters.assignedToId = userId;
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

      // If request was linked, update its status to converted_to_task
      if (task.requestId) {
        try {
          await storage.updateServiceRequestStatus(task.requestId, 'converted_to_task');
        } catch (err) {
          console.error("Error updating request status:", err);
        }
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
        
        // Technicians can only update technician tasks assigned to them
        if (currentUser.role === "technician") {
          if (task.executorType !== "technician" || 
              (task.assignedToId !== userId && task.assignedPool !== "technician_pool")) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
        }
        
        // Students can only update student tasks assigned to them
        if (currentUser.role === "student") {
          if (task.executorType !== "student" || 
              (task.assignedToId !== userId && task.assignedPool !== "student_pool")) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
          // Students cannot reassign tasks
          if (req.body.assignedToId !== undefined) {
            return res.status(403).json({ message: "Forbidden: Students cannot reassign tasks" });
          }
        }
      }

      const updateData: any = { ...req.body };

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
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Allow students and technicians to update status on their assigned tasks
  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status, onHoldReason } = req.body;
      const taskId = req.params.id;
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Get the task to check access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Role-based access control for updating task status
      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot update tasks" });
      }
      
      // Students can only update student tasks assigned to them
      if (currentUser.role === "student") {
        if (task.executorType !== "student" || 
            (task.assignedToId !== userId && task.assignedPool !== "student_pool")) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }
      
      // Technicians can only update technician tasks assigned to them
      if (currentUser.role === "technician") {
        if (task.executorType !== "technician" || 
            (task.assignedToId !== userId && task.assignedPool !== "technician_pool")) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }

      const updateData: any = { status };
      if (status === "completed") {
        updateData.actualCompletionDate = new Date();
      }
      if (status === "on_hold" && onHoldReason) {
        updateData.onHoldReason = onHoldReason;
      }

      const updatedTask = await storage.updateTask(taskId, updateData);

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Create a task note if hold reason was provided
      if (status === "on_hold" && onHoldReason) {
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
      } else if (status === "completed" && updatedTask.requestId) {
        // Send completion message to requester
        await storage.createMessage({
          requestId: updatedTask.requestId,
          senderId: (req as any).userId,
          content: `Task "${updatedTask.name}" has been completed.`
        });
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

      const { endTime, durationMinutes } = req.body;

      // Validate endTime is provided and valid
      if (!endTime) {
        return res.status(400).json({ message: "endTime is required" });
      }

      const parsedEndTime = new Date(endTime);
      if (isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ message: "Invalid endTime format" });
      }

      const entry = await storage.updateTimeEntry(
        req.params.id,
        parsedEndTime,
        durationMinutes
      );
      res.json(entry);
    } catch (error) {
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
  app.post("/api/parts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const partData = insertPartUsedSchema.parse(req.body);
      const part = await storage.createPartUsed(partData);
      res.json(part);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ message: "Failed to create part" });
    }
  });

  app.delete("/api/parts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
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

  // Upload routes
  app.post("/api/uploads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

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
      const uploads = await storage.getUploadsByTask(req.params.taskId);
      res.json(uploads);
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

  app.delete("/api/uploads/:id", isAuthenticated, async (req, res) => {
    try {
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
      
      const checklist = await storage.updateTaskChecklist(req.params.id, req.body);
      res.json(checklist);
    } catch (error) {
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
      
      const group = await storage.updateChecklistGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
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
      
      const item = await storage.updateChecklistItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
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
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
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
      const space = await storage.updateSpace(req.params.id, req.body);
      if (!space) {
        return res.status(404).json({ message: "Space not found" });
      }
      res.json(space);
    } catch (error) {
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
      const item = await storage.updateEquipment(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error) {
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
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.patch("/api/vehicles/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
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
      const reservations = await storage.getVehicleReservations({
        userId,
      });
      res.json(reservations);
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

      if (reservation.userId !== req.userId && req.userRole !== "admin" && req.userRole !== "maintenance") {
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
      const updates = req.body;

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

      res.json(updatedReservation);
    } catch (error: any) {
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

      // Only the reservation owner can accept the advisory
      if (reservation.userId !== userId) {
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
        adminOverride: req.body.adminOverride === true ? true : undefined, // Only include if true
      };
      
      console.log("Cleaned body:", JSON.stringify(cleanedBody, null, 2));
      
      const logData = insertVehicleCheckOutLogSchema.parse(cleanedBody);
      console.log("Parsed log data:", JSON.stringify(logData, null, 2));

      // Verify reservation belongs to current user
      const reservation = await storage.getVehicleReservation(logData.reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      if (reservation.userId !== req.userId) {
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

      // Determine new vehicle status based on cleanliness and issues
      let newStatus = "available";
      if (logData.cleanlinessStatus === "needs_cleaning") {
        newStatus = "needs_cleaning";
      } else if (logData.issues && logData.issues.trim().length > 0) {
        newStatus = "needs_maintenance";
      }

      await storage.updateVehicleStatus(logData.vehicleId, newStatus);

      // Update reservation status
      await storage.updateReservationStatus(checkOutLog.reservationId, "completed");

      // Auto-create cleaning task if needed
      if (logData.cleanlinessStatus === "needs_cleaning") {
        const userId = req.userId;
        const vehicle = await storage.getVehicle(logData.vehicleId);

        if (vehicle) {
          await storage.createTask({
            vehicleId: logData.vehicleId,
            name: `Clean Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
            description: `Vehicle returned and needs cleaning. Check-in log ID: ${log.id}`,
            urgency: "medium",
            initialDate: new Date(),
            taskType: "one_time",
            status: "not_started",
            createdById: userId,
          });
        }
      }

      // Auto-create maintenance task if issues reported
      if (logData.issues && logData.issues.trim().length > 0) {
        const userId = req.userId;
        const vehicle = await storage.getVehicle(logData.vehicleId);

        if (vehicle) {
          await storage.createTask({
            vehicleId: logData.vehicleId,
            name: `Maintenance Required: ${vehicle.make} ${vehicle.model} (${vehicle.vehicleId})`,
            description: `Issues reported: ${logData.issues}\n\nCheck-in log ID: ${log.id}`,
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
      const schedule = await storage.updateVehicleMaintenanceSchedule(req.params.id, req.body);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
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
      const updateData = { ...req.body };
      if (updateData.expirationDate) {
        updateData.expirationDate = new Date(updateData.expirationDate);
      }
      const document = await storage.updateVehicleDocument(req.params.id, updateData);
      if (!document) {
        return res.status(404).json({ message: "Vehicle document not found" });
      }
      res.json(document);
    } catch (error) {
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
      const contact = await storage.updateEmergencyContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
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
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const data = insertProjectSchema.parse({
        ...req.body,
        createdById: user.id,
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
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
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
      const member = await storage.updateProjectTeamMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
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
      const vendor = await storage.updateProjectVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Project vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
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

  // ============== QUOTES ==============

  // Get all quotes
  app.get("/api/quotes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { projectId, vendorId, status } = req.query;
      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (vendorId) filters.vendorId = vendorId as string;
      if (status) filters.status = status as string;
      
      const quoteList = await storage.getQuotes(filters);
      res.json(quoteList);
    } catch (error) {
      console.error("Error fetching quotes:", error);
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

  // Create quote
  app.post("/api/quotes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const data = insertQuoteSchema.parse({
        ...req.body,
        createdById: user.id,
      });
      
      const quote = await storage.createQuote(data);
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
  app.patch("/api/quotes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const updateData: any = { ...req.body };
      
      // Handle status changes
      if (req.body.status === "submitted" && !updateData.submittedAt) {
        updateData.submittedAt = new Date();
      }
      if (req.body.status === "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedById = user.id;
      }
      
      const quote = await storage.updateQuote(req.params.id, updateData);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Delete quote
  app.delete("/api/quotes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // ============== QUOTE ITEMS ==============

  // Get quote items
  app.get("/api/quotes/:id/items", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const items = await storage.getQuoteItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      res.status(500).json({ message: "Failed to fetch quote items" });
    }
  });

  // Create quote item
  app.post("/api/quotes/:id/items", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertQuoteItemSchema.parse({
        ...req.body,
        quoteId: req.params.id,
        lineTotal: (req.body.quantity || 1) * (req.body.unitCost || 0),
      });
      const item = await storage.createQuoteItem(data);
      
      // Update quote total
      const items = await storage.getQuoteItems(req.params.id);
      const total = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
      await storage.updateQuote(req.params.id, { totalAmount: total });
      
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating quote item:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create quote item" });
    }
  });

  // Update quote item
  app.patch("/api/quote-items/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        lineTotal: (req.body.quantity || 1) * (req.body.unitCost || 0),
      };
      const item = await storage.updateQuoteItem(req.params.id, updateData);
      if (!item) {
        return res.status(404).json({ message: "Quote item not found" });
      }
      
      // Update quote total
      const items = await storage.getQuoteItems(item.quoteId);
      const total = items.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
      await storage.updateQuote(item.quoteId, { totalAmount: total });
      
      res.json(item);
    } catch (error) {
      console.error("Error updating quote item:", error);
      res.status(500).json({ message: "Failed to update quote item" });
    }
  });

  // Delete quote item
  app.delete("/api/quote-items/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      // Get the item first to know which quote to update
      const item = await storage.getQuoteItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Quote item not found" });
      }
      
      const quoteId = item.quoteId;
      await storage.deleteQuoteItem(req.params.id);
      
      // Recalculate and update quote total
      const remainingItems = await storage.getQuoteItems(quoteId);
      const total = remainingItems.reduce((sum, i) => sum + (i.lineTotal || 0), 0);
      await storage.updateQuote(quoteId, { totalAmount: total });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote item:", error);
      res.status(500).json({ message: "Failed to delete quote item" });
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

      // Get quotes for this project
      const projectQuotes = await storage.getQuotes({ projectId });
      const approvedQuotes = projectQuotes.filter(q => q.status === "approved");
      const quotedAmount = approvedQuotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

      // Calculate actual costs from parts used on project tasks
      let actualPartsCost = 0;
      let totalTimeMinutes = 0;
      
      for (const task of projectTasks) {
        const parts = await storage.getPartsByTask(task.id);
        actualPartsCost += parts.reduce((sum, p) => sum + (p.cost || 0), 0);
        
        const timeEntries = await storage.getTimeEntriesByTask(task.id);
        totalTimeMinutes += timeEntries.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
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
          total: projectQuotes.length,
          approved: approvedQuotes.length,
          pending: projectQuotes.filter(q => q.status === "requested" || q.status === "submitted" || q.status === "under_review").length,
        },
      });
    } catch (error) {
      console.error("Error fetching project analytics:", error);
      res.status(500).json({ message: "Failed to fetch project analytics" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}