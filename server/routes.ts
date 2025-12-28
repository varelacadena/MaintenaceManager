import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, getCurrentUser, requireAdmin, requireMaintenanceOrAdmin, requireStaffOrHigher, requireRequestAccess } from "./middleware";
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
  insertAreaSchema,
  insertSubdivisionSchema,
  insertVendorSchema,
  insertInventoryItemSchema,
  insertPropertySchema,
  insertEquipmentSchema,
  insertVehicleSchema,
  insertVehicleReservationSchema,
  insertVehicleCheckOutLogSchema,
  insertVehicleCheckInLogSchema,
  insertVehicleMaintenanceScheduleSchema,
} from "@shared/schema";

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

      const bcrypt = await import("bcryptjs");
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
        email,
        firstName,
        lastName,
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
      if (!["admin", "maintenance", "staff"].includes(role)) {
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
      if (!["admin", "maintenance", "staff"].includes(role)) {
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

  app.post("/api/vendors", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

  app.post("/api/inventory", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

  app.patch("/api/inventory/:id/quantity", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

      // Requester, maintenance, or admin can delete
      const canDelete =
        request.requesterId === userId ||
        currentUser?.role === "admin" ||
        currentUser?.role === "maintenance";

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
    requireMaintenanceOrAdmin,
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

  // Task routes (admin and maintenance only)
  app.get("/api/tasks", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      let filters: any = {};

      // Role-based filtering
      if (currentUser?.role === "maintenance") {
        filters.assignedToId = userId; // Only see assigned tasks
      }
      // Admin sees all

      // Optional filters from query params
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.assignedToId) {
        filters.assignedToId = req.query.assignedToId;
      }
      if (req.query.assignedVendorId) {
        filters.assignedVendorId = req.query.assignedVendorId;
      }
      if (req.query.areaId) {
        filters.areaId = req.query.areaId;
      }

      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
        initialDate: req.body.initialDate ? new Date(req.body.initialDate) : new Date(),
        estimatedCompletionDate: req.body.estimatedCompletionDate ? new Date(req.body.estimatedCompletionDate) : undefined,
      });
      const task = await storage.createTask(taskData);

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
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
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

  app.patch("/api/tasks/:id/status", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const { status, onHoldReason } = req.body;
      const taskId = req.params.id;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
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
  app.post("/api/time-entries", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
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

  app.patch("/api/time-entries/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const timeEntry = await storage.getTimeEntry(req.params.id);

      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
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
    requireMaintenanceOrAdmin,
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
  app.post("/api/parts", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const partData = insertPartUsedSchema.parse(req.body);
      const part = await storage.createPartUsed(partData);
      res.json(part);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ message: "Failed to create part" });
    }
  });

  app.delete("/api/parts/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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
    requireMaintenanceOrAdmin,
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
    requireMaintenanceOrAdmin,
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
      const uploadURL = await getSignedUploadUrl();
      
      // Check if this is a mock URL (Object Storage not configured)
      const isMock = uploadURL.startsWith("https://mock-storage.local/");
      
      res.json({ 
        uploadURL,
        isMock,
        warning: isMock ? "Object Storage not configured. Files will not be persisted." : undefined
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
      
      const uploadData = insertUploadSchema.parse({
        ...req.body,
        uploadedById: userId,
      });
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
      
      const uploadData = insertUploadSchema.parse({
        ...req.body,
        uploadedById: userId,
      });
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

      if (currentUser.role === "admin" || currentUser.role === "maintenance") {
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
  app.post("/api/task-notes", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
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
    requireMaintenanceOrAdmin,
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

  app.delete("/api/task-notes/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const noteId = req.params.id;

      // Get the note to verify ownership
      const note = await storage.getTaskNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Task note not found" });
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

  app.post("/api/properties", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

  // Equipment routes
  app.get("/api/equipment", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const category = req.query.category as string;

      let equipment;
      if (propertyId && category) {
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

  app.post("/api/equipment", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      const item = await storage.createEquipment(equipmentData);
      res.json(item);
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.patch("/api/equipment/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

  app.delete("/api/equipment/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      await storage.deleteEquipment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
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

  app.post("/api/vehicles", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

      // Rule 3: If reservation is for tomorrow, start time must be >= 9:00 AM
      if (startDateOnly.getTime() === tomorrow.getTime()) {
        const startHour = startDate.getHours();
        const startMinute = startDate.getMinutes();
        const startTimeInMinutes = startHour * 60 + startMinute;
        const nineAMInMinutes = 9 * 60; // 9:00 AM = 540 minutes

        if (startTimeInMinutes < nineAMInMinutes) {
          return res.status(400).json({ 
            message: "Reservations for tomorrow must start at or after 9:00 AM" 
          });
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

        // Update vehicle status to reserved
        await storage.updateVehicleStatus(reservationData.vehicleId, "reserved");
      }

      const reservation = await storage.createVehicleReservation(reservationData);

      res.json(reservation);
    } catch (error) {
      console.error("Error creating vehicle reservation:", error);
      res.status(500).json({ message: "Failed to create vehicle reservation" });
    }
  });

  app.patch("/api/vehicle-reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const currentReservation = await storage.getVehicleReservation(req.params.id);
      if (!currentReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // If assigning a vehicle, check availability
      if (req.body.vehicleId && req.body.vehicleId !== currentReservation.vehicleId) {
        const isAvailable = await storage.checkVehicleAvailability(
          req.body.vehicleId,
          currentReservation.startDate,
          currentReservation.endDate,
          req.params.id
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Vehicle is not available for the selected dates" });
        }

        // Set old vehicle to available if it exists
        if (currentReservation.vehicleId) {
          const activeReservations = await storage.getVehicleReservations({
            vehicleId: currentReservation.vehicleId,
          });

          const hasOtherActiveReservations = activeReservations.some(
            r => r.id !== currentReservation.id && 
            (r.status === "pending" || r.status === "approved")
          );

          if (!hasOtherActiveReservations) {
            await storage.updateVehicleStatus(currentReservation.vehicleId, "available");
          }
        }

        // Set new vehicle to reserved only if status is pending or approved
        if (req.body.status === "pending" || req.body.status === "approved" || currentReservation.status === "pending" || currentReservation.status === "approved") {
          await storage.updateVehicleStatus(req.body.vehicleId, "reserved");
        }
      }

      const reservation = await storage.updateVehicleReservation(req.params.id, req.body);

      // Update vehicle status based on reservation status changes
      if (req.body.status && reservation?.vehicleId) {
        if (req.body.status === "cancelled" || req.body.status === "completed") {
          const activeReservations = await storage.getVehicleReservations({
            vehicleId: reservation.vehicleId,
          });

          const hasActiveReservations = activeReservations.some(
            r => r.id !== reservation.id && 
            (r.status === "pending" || r.status === "approved")
          );

          if (!hasActiveReservations) {
            await storage.updateVehicleStatus(reservation.vehicleId, "available");
          }
        } else if (req.body.status === "approved") {
          await storage.updateVehicleStatus(reservation.vehicleId, "reserved");
        }
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error updating vehicle reservation:", error);
      res.status(500).json({ message: "Failed to update vehicle reservation" });
    }
  });

  app.delete("/api/vehicle-reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const reservation = await storage.getVehicleReservation(req.params.id);
      if (reservation) {
        await storage.updateVehicleStatus(reservation.vehicleId, "available");
      }
      await storage.deleteVehicleReservation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle reservation:", error);
      res.status(500).json({ message: "Failed to delete vehicle reservation" });
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
    try {
      const logData = insertVehicleCheckOutLogSchema.parse(req.body);

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

      const log = await storage.createVehicleCheckOutLog(logData);

      // Update vehicle status to in_use and mileage
      await storage.updateVehicleStatus(logData.vehicleId, "in_use");
      await storage.updateVehicleMileage(logData.vehicleId, logData.startMileage);

      // Update reservation status to active
      await storage.updateReservationStatus(logData.reservationId, "active");

      res.json(log);
    } catch (error) {
      console.error("Error creating vehicle check-out log:", error);
      res.status(500).json({ message: "Failed to create vehicle check-out log" });
    }
  });

  app.delete("/api/vehicle-checkout-logs/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleCheckOutLog(req.params.id);
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

      const log = await storage.createVehicleCheckInLog(logData);

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

  app.delete("/api/vehicle-checkin-logs/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleCheckInLog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle check-in log:", error);
      res.status(500).json({ message: "Failed to delete vehicle check-in log" });
    }
  });

  // Sync vehicle statuses (admin only) - fixes vehicles stuck in reserved state
  app.post("/api/vehicles/sync-statuses", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      let updatedCount = 0;

      for (const vehicle of vehicles) {
        if (vehicle.status === "reserved") {
          // Check if there are any active reservations
          const activeReservations = await storage.getVehicleReservations({
            vehicleId: vehicle.id,
          });

          const hasActiveReservations = activeReservations.some(
            r => r.status === "pending" || r.status === "approved"
          );

          if (!hasActiveReservations) {
            await storage.updateVehicleStatus(vehicle.id, "available");
            updatedCount++;
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Updated ${updatedCount} vehicle(s) from reserved to available` 
      });
    } catch (error) {
      console.error("Error syncing vehicle statuses:", error);
      res.status(500).json({ message: "Failed to sync vehicle statuses" });
    }
  });

  // Vehicle maintenance schedule routes
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

  app.post("/api/vehicle-maintenance-schedules", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      const scheduleData = insertVehicleMaintenanceScheduleSchema.parse(req.body);
      const schedule = await storage.createVehicleMaintenanceSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to create vehicle maintenance schedule" });
    }
  });

  app.patch("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
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

  app.delete("/api/vehicle-maintenance-schedules/:id", isAuthenticated, requireMaintenanceOrAdmin, async (req, res) => {
    try {
      await storage.deleteVehicleMaintenanceSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle maintenance schedule:", error);
      res.status(500).json({ message: "Failed to delete vehicle maintenance schedule" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}