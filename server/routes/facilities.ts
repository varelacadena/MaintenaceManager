import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireEquipmentManager, requireTechnicianOrAdmin } from "../middleware";
import { handleRouteError, getAuthUser } from "../routeUtils";
import { handleFacilityRouteError } from "../routeFacilityError";
import {
  validateBuildingProperty,
  validateEquipmentLocation,
  validateSpaceBelongsToProperty,
} from "../facilityValidation";
import {
  insertAreaSchema,
  insertSubdivisionSchema,
  insertPropertySchema,
  insertSpaceSchema,
  insertEquipmentSchema,
  insertLockboxSchema,
  insertLockboxCodeSchema,
} from "@shared/schema";
import {
  deletePropertyWithAudit,
  deleteEquipmentWithAudit,
} from "../storage/entityCleanup";
import { z } from "zod";
import {
  normalizeEquipmentAssetTag,
  suggestEquipmentAssetTag,
} from "@shared/equipmentAssetTag";

const areaUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
});

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

  app.patch("/api/areas/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const areaData = areaUpdateSchema.parse(req.body);
      const area = await storage.updateArea(req.params.id, areaData);
      if (!area) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(area);
    } catch (error) {
      handleRouteError(res, error, "Failed to update department");
    }
  });

  app.delete("/api/areas/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteArea(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete department");
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
      if (validated.type && validated.type !== "building") {
        const existing = await storage.getProperty(req.params.id);
        if (existing?.type === "building") {
          const buildingSpaces = await storage.getSpacesByProperty(req.params.id);
          if (buildingSpaces.length > 0) {
            return res.status(400).json({
              message: "Remove or reassign spaces before changing a building to another property type",
            });
          }
        }
      }
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

  app.delete("/api/properties/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      await deletePropertyWithAudit(property, req.userId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete property");
    }
  });

  app.get("/api/properties/:id/tasks", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const includeCampusWide = req.query.includeCampusWide === "true";
      const tasks = await storage.getTasksByProperty(req.params.id, { includeCampusWide });
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
      await validateBuildingProperty(spaceData.propertyId);
      const space = await storage.createSpace(spaceData);
      res.json(space);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to create space");
    }
  });

  app.patch("/api/spaces/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertSpaceSchema.partial().parse(req.body);
      const existing = await storage.getSpace(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Space not found" });
      }
      const propertyId = validated.propertyId ?? existing.propertyId;
      if (validated.propertyId) {
        await validateBuildingProperty(propertyId);
        if (validated.propertyId !== existing.propertyId) {
          const equipCount = await storage.countEquipmentInSpace(req.params.id);
          if (equipCount > 0) {
            return res.status(400).json({
              message: "Move or unassign equipment before moving this space to another property",
            });
          }
        }
      }
      const space = await storage.updateSpace(req.params.id, validated);
      if (!space) {
        return res.status(404).json({ message: "Space not found" });
      }
      res.json(space);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid space data", errors: error.errors });
      }
      handleFacilityRouteError(res, error, "Failed to update space");
    }
  });

  app.delete("/api/spaces/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const equipCount = await storage.countEquipmentInSpace(req.params.id);
      await storage.deleteSpace(req.params.id);
      res.json({
        success: true,
        equipmentUnassigned: equipCount,
      });
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to delete space");
    }
  });

  app.get("/api/equipment", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const spaceId = req.query.spaceId as string;
      const category = req.query.category as string;

      let equipment;
      if (propertyId && spaceId) {
        await validateSpaceBelongsToProperty(spaceId, propertyId);
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

  app.get("/api/equipment/by-tag/:tag", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getEquipmentByAssetTag(req.params.tag);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch equipment by asset tag");
    }
  });

  app.get("/api/equipment/suggest-tag", isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const category = (req.query.category as string) || "general";
      const spaceId = req.query.spaceId as string | undefined;

      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const space = spaceId ? await storage.getSpace(spaceId) : undefined;
      const existingTags = await storage.getEquipmentAssetTagsByProperty(propertyId);
      const assetTag = suggestEquipmentAssetTag({
        propertyName: property.name,
        spaceName: space?.name ?? null,
        category,
        existingTags,
      });

      res.json({ assetTag });
    } catch (error) {
      handleRouteError(res, error, "Failed to suggest equipment asset tag");
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

  app.post("/api/equipment", isAuthenticated, requireEquipmentManager, async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      await validateEquipmentLocation(equipmentData.propertyId, equipmentData.spaceId);

      let assetTag = normalizeEquipmentAssetTag(equipmentData.assetTag);
      if (!assetTag) {
        const property = await storage.getProperty(equipmentData.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
        const space = equipmentData.spaceId
          ? await storage.getSpace(equipmentData.spaceId)
          : undefined;
        const existingTags = await storage.getEquipmentAssetTagsByProperty(equipmentData.propertyId);
        assetTag = suggestEquipmentAssetTag({
          propertyName: property.name,
          spaceName: space?.name ?? null,
          category: equipmentData.category ?? "general",
          existingTags,
        });
      }

      const item = await storage.createEquipment({
        ...equipmentData,
        assetTag,
      });
      res.json(item);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to create equipment");
    }
  });

  app.patch("/api/equipment/:id", isAuthenticated, requireEquipmentManager, async (req, res) => {
    try {
      const validated = insertEquipmentSchema.partial().parse(req.body);
      const existing = await storage.getEquipmentItem(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      const propertyId = validated.propertyId ?? existing.propertyId;
      const spaceId =
        validated.spaceId !== undefined ? validated.spaceId : existing.spaceId;
      await validateEquipmentLocation(propertyId, spaceId);

      const patchData = { ...validated };
      if (validated.assetTag !== undefined) {
        const normalized = normalizeEquipmentAssetTag(validated.assetTag);
        if (!normalized) {
          return res.status(400).json({ message: "Asset tag cannot be empty" });
        }
        patchData.assetTag = normalized;
      }

      const item = await storage.updateEquipment(req.params.id, patchData);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      handleFacilityRouteError(res, error, "Failed to update equipment");
    }
  });

  app.delete("/api/equipment/:id", isAuthenticated, requireEquipmentManager, async (req: any, res) => {
    try {
      const item = await storage.getEquipmentItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      await deleteEquipmentWithAudit(item, req.userId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete equipment");
    }
  });

  app.get("/api/equipment/:id/resources", isAuthenticated, async (req, res) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(404).json({ message: "Equipment not found" });
    }
    try {
      const resourceList = await storage.getEquipmentResources(req.params.id);
      res.json(resourceList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch equipment resources");
    }
  });

  app.get("/api/equipment/:id/uploads", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
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

  app.get("/api/lockboxes/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
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
        const reservationId = req.body?.reservationId;
        if (!reservationId) {
          return res.status(400).json({ message: "Reservation ID is required to assign a lockbox code" });
        }
        const reservation = await storage.getVehicleReservation(reservationId);
        const now = new Date();
        const hasValidReservation = !!reservation &&
          reservation.userId === user.id &&
          reservation.lockboxId === lockboxId &&
          reservation.status === "approved" &&
          now.getTime() >= new Date(reservation.startDate).getTime() - 60 * 60 * 1000 &&
          now.getTime() <= new Date(reservation.endDate).getTime();

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
