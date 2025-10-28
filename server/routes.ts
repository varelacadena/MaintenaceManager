import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, getCurrentUser } from "./middleware";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { seedDatabase } from "./seed";
import {
  insertServiceRequestSchema,
  insertPartUsedSchema,
  insertMessageSchema,
  insertUploadSchema,
  insertTaskNoteSchema,
  insertAreaSchema,
  insertSubdivisionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed database with default areas
  await seedDatabase();

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.post("/api/areas", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const areaData = insertAreaSchema.parse(req.body);
      const area = await storage.createArea(areaData);
      res.json(area);
    } catch (error) {
      console.error("Error creating area:", error);
      res.status(500).json({ message: "Failed to create area" });
    }
  });

  app.delete("/api/areas/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.post("/api/subdivisions", isAuthenticated, requireRole("admin"), async (req, res) => {
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
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      let filters: any = {};

      // Role-based filtering
      if (currentUser?.role === "staff") {
        filters.userId = userId; // Only see own requests
      } else if (currentUser?.role === "maintenance") {
        filters.assignedToId = userId; // Only see assigned tasks
      }
      // Admin sees all

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
      const userId = req.user.claims.sub;
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

  app.patch(
    "/api/service-requests/:id/status",
    isAuthenticated,
    async (req, res) => {
      try {
        const { status, onHoldReason } = req.body;
        const request = await storage.updateServiceRequestStatus(
          req.params.id,
          status,
          onHoldReason
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

  app.patch(
    "/api/service-requests/:id/assign",
    isAuthenticated,
    requireRole("admin"),
    async (req, res) => {
      try {
        const { assignedToId } = req.body;
        const request = await storage.updateServiceRequestAssignment(
          req.params.id,
          assignedToId
        );
        res.json(request);
      } catch (error) {
        console.error("Error assigning service request:", error);
        res
          .status(500)
          .json({ message: "Failed to assign service request" });
      }
    }
  );

  // Time tracking routes
  app.post("/api/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.createTimeEntry({
        ...req.body,
        userId,
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.patch("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const { endTime, durationMinutes } = req.body;
      const entry = await storage.updateTimeEntry(
        req.params.id,
        new Date(endTime),
        durationMinutes
      );
      res.json(entry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.get(
    "/api/time-entries/request/:requestId",
    isAuthenticated,
    async (req, res) => {
      try {
        const entries = await storage.getTimeEntriesByRequest(
          req.params.requestId
        );
        res.json(entries);
      } catch (error) {
        console.error("Error fetching time entries:", error);
        res.status(500).json({ message: "Failed to fetch time entries" });
      }
    }
  );

  // Parts routes
  app.post("/api/parts", isAuthenticated, async (req, res) => {
    try {
      const partData = insertPartUsedSchema.parse(req.body);
      const part = await storage.createPartUsed(partData);
      res.json(part);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ message: "Failed to create part" });
    }
  });

  app.get(
    "/api/parts/request/:requestId",
    isAuthenticated,
    async (req, res) => {
      try {
        const parts = await storage.getPartsByRequest(req.params.requestId);
        res.json(parts);
      } catch (error) {
        console.error("Error fetching parts:", error);
        res.status(500).json({ message: "Failed to fetch parts" });
      }
    }
  );

  // Message routes
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get(
    "/api/messages/request/:requestId",
    isAuthenticated,
    async (req, res) => {
      try {
        const messages = await storage.getMessagesByRequest(
          req.params.requestId
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

      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      // Verify user has access to this request
      const request = await storage.getServiceRequest(req.body.requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Only assigned maintenance staff, requester, or admin can upload
      const canUpload =
        currentUser?.role === "admin" ||
        request.assignedToId === userId ||
        request.requesterId === userId;
        
      if (!canUpload) {
        return res.status(403).json({ error: "Forbidden: Cannot upload to this request" });
      }

      const objectStorageService = new ObjectStorageService();
      
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectUrl,
        {
          owner: userId,
          visibility: "private",
        }
      );

      const uploadData = insertUploadSchema.parse({
        requestId: req.body.requestId,
        uploadedById: userId,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
        objectPath: objectPath,
      });

      const upload = await storage.createUpload(uploadData);
      res.json(upload);
    } catch (error) {
      console.error("Error creating upload:", error);
      res.status(500).json({ error: "Failed to create upload" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Task notes routes
  app.post("/api/task-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    "/api/task-notes/request/:requestId",
    isAuthenticated,
    async (req, res) => {
      try {
        const notes = await storage.getNotesByRequest(req.params.requestId);
        res.json(notes);
      } catch (error) {
        console.error("Error fetching task notes:", error);
        res.status(500).json({ message: "Failed to fetch task notes" });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}
