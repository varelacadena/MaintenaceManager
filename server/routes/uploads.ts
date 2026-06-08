import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { canAccessTask } from "../middleware";
import { handleRouteError, canAccessServiceRequest } from "../routeUtils";
import {
  registerUpload,
  sendUploadAuthError,
  assertCanDownloadUpload,
} from "../uploadRegistration";

function referencesObjectPath(value: unknown, objectKey: string) {
  if (typeof value !== "string" || !value) return false;
  const encodedKey = encodeURIComponent(objectKey);
  try {
    return value === objectKey || value.includes(encodedKey) || decodeURIComponent(value).includes(objectKey);
  } catch {
    return value === objectKey || value.includes(encodedKey) || value.includes(objectKey);
  }
}

async function isReferencedEntityImage(objectKey: string) {
  const [properties, equipment, vehicles, resources] = await Promise.all([
    storage.getProperties(),
    storage.getEquipment(),
    storage.getVehicles(),
    storage.getResources(),
  ]);

  return (
    properties.some((property) => referencesObjectPath(property.imageUrl, objectKey)) ||
    equipment.some((item) =>
      referencesObjectPath(item.imageUrl, objectKey) ||
      referencesObjectPath(item.manufacturerImageUrl, objectKey)
    ) ||
    vehicles.some((vehicle) => referencesObjectPath(vehicle.imageUrl, objectKey)) ||
    resources.some((resource) =>
      referencesObjectPath(resource.objectPath, objectKey) ||
      referencesObjectPath(resource.url, objectKey)
    )
  );
}

export function registerUploadRoutes(app: Express) {
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { getSignedUploadUrl } = await import("../objectStorage");
      const { uploadURL, objectPath } = await getSignedUploadUrl();

      res.json({
        uploadURL,
        objectPath,
        isMock: false,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to get upload URL");
    }
  });

  app.get("/api/objects/image", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).userId;
      let rawPath = req.query.path as string;
      const { getDownloadUrl, getPrivateDir, parseSupabaseStorageUrl } =
        await import("../objectStorage");
      if (!rawPath) {
        return res.status(400).json({ message: "path query parameter is required" });
      }

      let objectKey: string;
      let supabaseBucket: string | undefined;

      if (rawPath.includes(".supabase.co/storage/")) {
        const parsed = parseSupabaseStorageUrl(rawPath);
        if (!parsed) {
          return res.status(400).json({ message: "Cannot resolve Supabase image path" });
        }
        objectKey = parsed.objectPath;
        supabaseBucket = parsed.bucket;
      } else if (rawPath.startsWith("https://storage.googleapis.com/")) {
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

      if (!objectKey.startsWith("uploads/")) {
        return res.status(400).json({ message: "Invalid image path" });
      }

      const storedUpload = await storage.getUploadByObjectPath(objectKey);
      if (storedUpload) {
        const hasAccess = await assertCanDownloadUpload(userId, storedUpload);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const isReferencedImage = await isReferencedEntityImage(objectKey);
        if (!isReferencedImage) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const signedUrl = await getDownloadUrl(objectKey, supabaseBucket);
      return res.redirect(302, signedUrl);
    } catch (error) {
      handleRouteError(res, error, "Failed to serve image");
    }
  });

  const handleUploadRegister = async (req: any, res: any) => {
    try {
      const result = await registerUpload(req.userId, req.body);
      if (result.error) {
        return sendUploadAuthError(res, result.error);
      }
      res.json(result.upload);
    } catch (error) {
      handleRouteError(res, error, "Failed to create upload");
    }
  };

  app.post("/api/uploads", isAuthenticated, handleUploadRegister);
  app.put("/api/uploads", isAuthenticated, handleUploadRegister);

  app.get("/api/uploads/:uploadId/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const upload = await storage.getUpload(req.params.uploadId);
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }

      const hasAccess = await assertCanDownloadUpload(userId, upload);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (upload.objectUrl.includes("mock-storage.local")) {
        return res.status(400).json({
          message:
            "This file was uploaded before storage was properly configured and cannot be downloaded.",
          isMock: true,
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

      if (upload.objectUrl.includes(".supabase.co/storage/")) {
        try {
          const { getDownloadUrl, parseSupabaseStorageUrl } =
            await import("../objectStorage");
          const parsed = parseSupabaseStorageUrl(upload.objectUrl);
          if (parsed) {
            const downloadUrl = await getDownloadUrl(
              parsed.objectPath,
              parsed.bucket
            );
            return res.json({ downloadUrl, fileName: upload.fileName });
          }
        } catch (error) {
          console.error("Error generating signed URL from Supabase objectUrl:", error);
        }
        return res.status(400).json({ message: "File cannot be downloaded - invalid Supabase URL" });
      }

      if (upload.objectUrl.startsWith("https://storage.googleapis.com/")) {
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

  app.get("/api/uploads/request/:requestId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const hasAccess = await canAccessServiceRequest(userId, req.params.requestId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: Cannot access these uploads" });
      }
      const uploads = await storage.getUploadsByRequest(req.params.requestId);
      res.json(uploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch uploads");
    }
  });

  app.get("/api/uploads/task/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const hasAccess = await canAccessTask(userId, req.params.taskId);
      const user = req.currentUser;
      if (!hasAccess && user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Cannot access these uploads" });
      }

      const taskUploads = await storage.getUploadsByTask(req.params.taskId);

      if (req.query.includeSubtasks === "true") {
        const subTasks = await storage.getSubTasks(req.params.taskId);
        const subtaskUploadArrays = await Promise.all(
          subTasks.map((st) => storage.getUploadsByTask(st.id))
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
      const user = await storage.getUser((req as any).userId);
      const log = await storage.getVehicleCheckOutLog(req.params.checkOutLogId);
      if (!log) {
        return res.status(404).json({ message: "Check-out log not found" });
      }
      if (!user || (user.role !== "admin" && user.role !== "technician" && log.userId !== user.id)) {
        return res.status(403).json({ message: "Forbidden: Cannot access these uploads" });
      }
      const uploads = await storage.getUploadsByVehicleCheckOutLog(req.params.checkOutLogId);
      res.json(uploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch uploads");
    }
  });

  app.get("/api/uploads/vehicle-checkin/:checkInLogId", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser((req as any).userId);
      const log = await storage.getVehicleCheckInLog(req.params.checkInLogId);
      if (!log) {
        return res.status(404).json({ message: "Check-in log not found" });
      }
      if (!user || (user.role !== "admin" && user.role !== "technician" && log.userId !== user.id)) {
        return res.status(403).json({ message: "Forbidden: Cannot access these uploads" });
      }
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
          hasAccess = await canAccessServiceRequest(userId, upload.requestId);
        } else if (upload.equipmentId && currentUser.role === "admin") {
          hasAccess = true;
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
