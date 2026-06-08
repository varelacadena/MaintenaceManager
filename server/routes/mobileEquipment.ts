import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTechnicianOrAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import {
  insertMobileEquipmentSchema,
  createMobileEquipmentMaintenanceLogBodySchema,
} from "@shared/schema";

export function registerMobileEquipmentRoutes(app: Express) {
  app.get("/api/mobile-equipment", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const partNumber = req.query.partNumber as string | undefined;
      const limit = req.query.limit ? Math.min(Math.max(Number.parseInt(String(req.query.limit), 10) || 50, 1), 500) : 200;
      const offset = req.query.offset ? Math.max(Number.parseInt(String(req.query.offset), 10) || 0, 0) : 0;
      const items = await storage.getMobileEquipmentList({
        search,
        category,
        status,
        partNumber,
        limit,
        offset,
      });
      res.json(items);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch mobile equipment");
    }
  });

  app.get("/api/mobile-equipment/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const item = await storage.getMobileEquipment(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch mobile equipment");
    }
  });

  app.post("/api/mobile-equipment", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertMobileEquipmentSchema.parse(req.body);
      const item = await storage.createMobileEquipment(data);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to create mobile equipment");
    }
  });

  app.patch("/api/mobile-equipment/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertMobileEquipmentSchema.partial().parse(req.body);
      const item = await storage.updateMobileEquipment(req.params.id, data);
      if (!item) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update mobile equipment");
    }
  });

  app.delete("/api/mobile-equipment/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteMobileEquipment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete mobile equipment");
    }
  });

  app.get(
    "/api/mobile-equipment/:id/maintenance-logs",
    isAuthenticated,
    requireTechnicianOrAdmin,
    async (req, res) => {
      try {
        const equipment = await storage.getMobileEquipment(req.params.id);
        if (!equipment) {
          return res.status(404).json({ message: "Equipment not found" });
        }
        const logs = await storage.getMobileEquipmentMaintenanceLogs(req.params.id);
        res.json(logs);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch maintenance logs");
      }
    },
  );

  app.post(
    "/api/mobile-equipment/:id/maintenance-logs",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const equipment = await storage.getMobileEquipment(req.params.id);
        if (!equipment) {
          return res.status(404).json({ message: "Equipment not found" });
        }

        const body = createMobileEquipmentMaintenanceLogBodySchema.parse(req.body);
        const { parts, maintenanceDate, ...logFields } = body;

        const log = await storage.createMobileEquipmentMaintenanceLog(
          {
            ...logFields,
            mobileEquipmentId: req.params.id,
            maintenanceDate: maintenanceDate ?? new Date(),
          },
          parts.map((p) => ({
            partName: p.partName,
            partNumber: p.partNumber ?? null,
            quantity: p.quantity ?? 1,
            vendor: p.vendor ?? null,
            notes: p.notes ?? null,
          })),
        );

        if (log.hoursOrMeterAtMaintenance != null) {
          await storage.updateMobileEquipment(req.params.id, {
            hoursOrMeter: log.hoursOrMeterAtMaintenance,
          });
        }

        res.json(log);
      } catch (error) {
        handleRouteError(res, error, "Failed to create maintenance log");
      }
    },
  );

  app.delete(
    "/api/mobile-equipment-maintenance-logs/:id",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        await storage.deleteMobileEquipmentMaintenanceLog(req.params.id);
        res.json({ success: true });
      } catch (error) {
        handleRouteError(res, error, "Failed to delete maintenance log");
      }
    },
  );
}
