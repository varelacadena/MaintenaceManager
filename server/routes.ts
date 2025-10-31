import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, getCurrentUser, requireAdmin, requireMaintenanceOrAdmin, requireStaffOrHigher, requireRequestAccess } from "./middleware";
import bcrypt from "bcryptjs";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
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
    requireRequestAccess(),
    async (req, res) => {
      try {
        const request = await storage.getServiceRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ message: "Request not found" });
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

  // Object storage routes for uploads
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/uploads", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.objectUrl) {
        return res.status(400).json({ error: "objectUrl is required" });
      }

      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      // Verify user has access to upload (either to request or task)
      if (req.body.requestId) {
        const request = await storage.getServiceRequest(req.body.requestId);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        // Only requester or admin can upload to requests
        const canUpload =
          currentUser?.role === "admin" ||
          request.requesterId === userId;

        if (!canUpload) {
          return res.status(403).json({ error: "Forbidden: Cannot upload to this request" });
        }
      } else if (req.body.taskId) {
        const task = await storage.getTask(req.body.taskId);
        if (!task) {
          return res.status(404).json({ error: "Task not found" });
        }

        // Only assigned staff or admin can upload to tasks
        const canUpload =
          currentUser?.role === "admin" ||
          currentUser?.role === "maintenance" ||
          task.assignedToId === userId;

        if (!canUpload) {
          return res.status(403).json({ error: "Forbidden: Cannot upload to this task" });
        }
      } else {
        return res.status(400).json({ error: "Either requestId or taskId is required" });
      }

      const objectStorageService = new ObjectStorageService();

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectUrl,
        {
          owner: userId,
          visibility: "private",
        }
      );

      const uploadData: any = {
        uploadedById: userId,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
        objectPath: objectPath,
      };

      // Set either requestId or taskId, but not both
      if (req.body.requestId) {
        uploadData.requestId = req.body.requestId;
        uploadData.taskId = null;
      } else {
        uploadData.requestId = null;
        uploadData.taskId = req.body.taskId;
      }

      const validatedUploadData = insertUploadSchema.parse(uploadData);
      const upload = await storage.createUpload(validatedUploadData);
      res.json(upload);
    } catch (error) {
      console.error("Error creating upload:", error);
      res.status(500).json({ error: "Failed to create upload" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get(
    "/api/uploads/request/:requestId",
    isAuthenticated,
    async (req, res) => {
      try {
        const uploads = await storage.getUploadsByRequest(req.params.requestId);
        res.json(uploads);
      } catch (error) {
        console.error("Error fetching uploads:", error);
        res.status(500).json({ message: "Failed to fetch uploads" });
      }
    }
  );

  app.get(
    "/api/uploads/task/:taskId",
    isAuthenticated,
    requireMaintenanceOrAdmin,
    async (req, res) => {
      try {
        const uploads = await storage.getUploadsByTask(req.params.taskId);
        res.json(uploads);
      } catch (error) {
        console.error("Error fetching uploads:", error);
        res.status(500).json({ message: "Failed to fetch uploads" });
      }
    }
  );

  app.delete("/api/uploads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const upload = await storage.getUpload(req.params.id);

      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      // Verify user has permission to delete
      if (upload.requestId) {
        const request = await storage.getServiceRequest(upload.requestId);
        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        // Only requester or admin can delete from requests
        const canDelete =
          currentUser?.role === "admin" ||
          request.requesterId === userId;

        if (!canDelete) {
          return res.status(403).json({ message: "Forbidden: Cannot delete this attachment" });
        }
      } else if (upload.taskId) {
        const task = await storage.getTask(upload.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        // Only assigned staff, maintenance, or admin can delete from tasks
        const canDelete =
          currentUser?.role === "admin" ||
          currentUser?.role === "maintenance" ||
          task.assignedToId === userId;

        if (!canDelete) {
          return res.status(403).json({ message: "Forbidden: Cannot delete this attachment" });
        }
      }

      await storage.deleteUpload(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting upload:", error);
      res.status(500).json({ message: "Failed to delete upload" });
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

  const httpServer = createServer(app);

  return httpServer;
}