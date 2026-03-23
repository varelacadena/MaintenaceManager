import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTechnicianOrAdmin } from "../middleware";
import { handleRouteError, getAuthUser } from "../routeUtils";
import {
  insertAreaSchema,
  insertSubdivisionSchema,
  insertPropertySchema,
  insertSpaceSchema,
  insertEquipmentSchema,
  insertLockboxSchema,
  insertLockboxCodeSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerFacilityRoutes(app: Express) {
  app.get("/api/areas", isAuthenticated, async (req, res) => {
    try {
      const areas = await storage.getAreas();
      res.json(areas);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch areas");
    }
  });

  app.post("/api/areas", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const areaData = insertAreaSchema.parse(req.body);
      const area = await storage.createArea(areaData);
      res.json(area);
    } catch (error) {
      handleRouteError(res, error, "Failed to create area");
    }
  });

  app.delete("/api/areas/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteArea(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete area");
    }
  });

  app.get("/api/subdivisions/:areaId", isAuthenticated, async (req, res) => {
    try {
      const subdivisions = await storage.getSubdivisionsByArea(
        req.params.areaId
      );
      res.json(subdivisions);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch subdivisions");
    }
  });

  app.post("/api/subdivisions", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const subdivisionData = insertSubdivisionSchema.parse(req.body);
      const subdivision = await storage.createSubdivision(subdivisionData);
      res.json(subdivision);
    } catch (error) {
      handleRouteError(res, error, "Failed to create subdivision");
    }
  });

  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch properties");
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
      handleRouteError(res, error, "Failed to fetch property");
    }
  });

  app.post("/api/properties", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      handleRouteError(res, error, "Failed to create property");
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
      handleRouteError(res, error, "Failed to delete property");
    }
  });

  app.get("/api/properties/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByProperty(req.params.id);
      res.json(tasks);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch property tasks");
    }
  });

  app.get("/api/properties/:id/resources", isAuthenticated, async (req, res) => {
    try {
      const resources = await storage.getPropertyResources(req.params.id);
      res.json(resources);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch property resources");
    }
  });

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
      handleRouteError(res, error, "Failed to fetch spaces");
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
      handleRouteError(res, error, "Failed to fetch space");
    }
  });

  app.post("/api/spaces", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const spaceData = insertSpaceSchema.parse(req.body);
      
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
      handleRouteError(res, error, "Failed to create space");
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
      handleRouteError(res, error, "Failed to delete space");
    }
  });

  app.get("/api/equipment", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const spaceId = req.query.spaceId as string;
      const category = req.query.category as string;

      let equipment;
      if (propertyId && spaceId) {
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
      handleRouteError(res, error, "Failed to fetch equipment");
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
      handleRouteError(res, error, "Failed to fetch equipment");
    }
  });

  app.post("/api/equipment", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      const item = await storage.createEquipment(equipmentData);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to create equipment");
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
      handleRouteError(res, error, "Failed to delete equipment");
    }
  });

  app.get("/api/equipment/:id/resources", isAuthenticated, async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.json([]);
    }
    try {
      const resourceList = await storage.getEquipmentResources(req.params.id);
      res.json(resourceList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch equipment resources");
    }
  });

  app.get("/api/equipment/:id/uploads", isAuthenticated, async (req, res) => {
    try {
      const equipmentId = req.params.id;
      const equipmentUploads = await storage.getUploadsByEquipment(equipmentId);
      res.json(equipmentUploads);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch equipment uploads");
    }
  });

  app.get("/api/lockboxes", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const lockboxes = await storage.getLockboxes();
      res.json(lockboxes);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch lockboxes");
    }
  });

  app.get("/api/lockboxes/:id", isAuthenticated, async (req, res) => {
    try {
      const lockbox = await storage.getLockbox(req.params.id);
      if (!lockbox) return res.status(404).json({ message: "Lockbox not found" });
      res.json(lockbox);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch lockbox");
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
      handleRouteError(res, error, "Failed to delete lockbox");
    }
  });

  app.get("/api/lockboxes/:id/codes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const codes = await storage.getLockboxCodes(req.params.id);
      res.json(codes);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch lockbox codes");
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
      handleRouteError(res, error, "Failed to delete lockbox code");
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
      handleRouteError(res, error, "Failed to assign lockbox code");
    }
  });
}
