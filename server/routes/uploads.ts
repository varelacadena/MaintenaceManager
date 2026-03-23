import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { canAccessTask } from "../middleware";
import { handleRouteError, getAuthUser } from "../routeUtils";
import { insertUploadSchema } from "@shared/schema";
import { z } from "zod";

export function registerUploadRoutes(app: Express) {
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { getSignedUploadUrl } = await import("../objectStorage");
      const { uploadURL, objectPath } = await getSignedUploadUrl();

      res.json({ 
        uploadURL,
        objectPath,
        isMock: false
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to get upload URL");
    }
  });

  app.get("/api/objects/image", isAuthenticated, async (req, res) => {
    try {
      const { getDownloadUrl, getPrivateDir } = await import("../objectStorage");
      let rawPath = req.query.path as string;
      if (!rawPath) {
        return res.status(400).json({ message: "path query parameter is required" });
      }

      let objectKey: string;

      if (rawPath.startsWith("https://storage.googleapis.com/")) {
        const urlPath = new URL(rawPath).pathname;
        const uploadsMatch = urlPath.match(/\/uploads\/(.+)$/);
        if (uploadsMatch) {
          objectKey = `uploads/${uploadsMatch[1]}`;
        } else {
          const privateDir = getPrivateDir();
          if (privateDir) {
            const privateDirParts = privateDir.replace(/^\//, "").split("/");
            const privateDirName = privateDirParts.slice(1).join("/");
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
      handleRouteError(res, error, "Failed to serve image");
    }
  });

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
      if (req.body.objectPath && (!objectUrl.startsWith('http') || objectUrl.includes('mock-storage.local'))) {
        try {
          const { getDownloadUrl, getBucketId } = await import("../objectStorage");
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
    } catch (error) {
      handleRouteError(res, error, "Failed to create upload");
    }
  });

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
      if (req.body.objectPath && (!objectUrl.startsWith('http') || objectUrl.includes('mock-storage.local'))) {
        try {
          const { getDownloadUrl, getBucketId } = await import("../objectStorage");
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
    } catch (error) {
      handleRouteError(res, error, "Failed to create upload");
    }
  });

  app.get("/api/uploads/:uploadId/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const upload = await storage.getUpload(req.params.uploadId);
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isStaff = user.role === 'admin' || user.role === 'technician';
      
      if (!isStaff) {
        let hasAccess = false;
        
        if (upload.uploadedById === userId) {
          hasAccess = true;
        }
        
        if (!hasAccess && upload.requestId) {
          const request = await storage.getServiceRequest(upload.requestId);
          if (request && request.requesterId === userId) {
            hasAccess = true;
          }
        }
        
        if (!hasAccess && upload.taskId) {
          const task = await storage.getTask(upload.taskId);
          if (task) {
            if (task.requestId) {
              const request = await storage.getServiceRequest(task.requestId);
              if (request && request.requesterId === userId) {
                hasAccess = true;
              }
            }
          }
        }
        
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

      if (upload.objectUrl.includes('mock-storage.local')) {
        return res.status(400).json({ 
          message: "This file was uploaded before storage was properly configured and cannot be downloaded.",
          isMock: true
        });
      }

      if (upload.objectPath) {
        try {
          const { getDownloadUrl } = await import("../objectStorage");
          const downloadUrl = await getDownloadUrl(upload.objectPath);
          return res.json({ downloadUrl, fileName: upload.fileName });
        } catch (error) {
          console.error("Error getting signed download URL:", error);
          return res.status(500).json({ message: "Failed to generate download URL" });
        }
      }

      if (upload.objectUrl.startsWith('https://storage.googleapis.com/')) {
        try {
          const { getDownloadUrl, getPrivateDir } = await import("../objectStorage");
          const privateDir = getPrivateDir();
          
          if (privateDir) {
            const url = new URL(upload.objectUrl);
            const fullPath = url.pathname;
            
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
        
        return res.json({ downloadUrl: upload.objectUrl, fileName: upload.fileName });
      }

      return res.status(400).json({ message: "File cannot be downloaded - invalid storage URL" });
    } catch (error) {
      handleRouteError(res, error, "Failed to get download URL");
    }
  });

  app.get("/api/uploads/request/:requestId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByRequest(req.params.requestId);
      res.json(uploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch uploads");
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
      handleRouteError(res, error, "Failed to fetch uploads");
    }
  });

  app.get("/api/uploads/vehicle-checkout/:checkOutLogId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByVehicleCheckOutLog(req.params.checkOutLogId);
      res.json(uploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch uploads");
    }
  });

  app.get("/api/uploads/vehicle-checkin/:checkInLogId", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUploadsByVehicleCheckInLog(req.params.checkInLogId);
      res.json(uploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch uploads");
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
      handleRouteError(res, error, "Failed to delete upload");
    }
  });
}
