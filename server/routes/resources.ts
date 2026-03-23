import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { insertResourceSchema } from "@shared/schema";
import { z } from "zod";

export function registerResourceRoutes(app: Express) {
  app.get("/api/resource-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getResourceCategories();
      res.json(categories);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch resource categories");
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
    } catch (error) {
      handleRouteError(res, error, "Failed to create resource category");
    }
  });

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
      handleRouteError(res, error, "Failed to fetch resource folders");
    }
  });

  app.get("/api/resource-folders/:id", isAuthenticated, async (req, res) => {
    try {
      const folder = await storage.getResourceFolderById(req.params.id);
      if (!folder) return res.status(404).json({ message: "Folder not found" });
      res.json(folder);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch resource folder");
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
      handleRouteError(res, error, "Failed to create resource folder");
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
      handleRouteError(res, error, "Failed to update resource folder");
    }
  });

  app.delete("/api/resource-folders/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteResourceFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete resource folder");
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
      handleRouteError(res, error, "Failed to fetch resources");
    }
  });

  app.get("/api/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const resource = await storage.getResourceById(req.params.id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });
      res.json(resource);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch resource");
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
      handleRouteError(res, error, "Failed to create resource");
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
    } catch (error) {
      handleRouteError(res, error, "Failed to update resource");
    }
  });

  app.delete("/api/resources/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteResource(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete resource");
    }
  });
}
