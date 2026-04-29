import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";

export function registerInventoryRoutes(app: Express) {
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory items");
    }
  });

  app.get("/api/inventory/by-barcode/:barcode", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItemByBarcode(req.params.barcode);
      if (!item) {
        return res.status(404).json({ message: "No inventory item found with that barcode" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch inventory item by barcode");
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
      handleRouteError(res, error, "Failed to fetch inventory item");
    }
  });

  app.post("/api/inventory", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to create inventory item");
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const cleaned = { ...req.body };
      for (const key of ["quantity", "minQuantity", "cost"]) {
        if (cleaned[key] === "" || cleaned[key] === null) {
          delete cleaned[key];
        }
      }
      const itemData = insertInventoryItemSchema.partial().parse(cleaned);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory item");
    }
  });

  app.patch("/api/inventory/:id/quantity", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quantitySchema = z.object({ change: z.number() });
      const { change } = quantitySchema.parse(req.body);
      const item = await storage.updateInventoryQuantity(req.params.id, change);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory quantity");
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete inventory item");
    }
  });

  app.patch("/api/inventory/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const stockStatusSchema = z.object({ stockStatus: z.enum(["stocked", "low", "out"]) });
      const { stockStatus } = stockStatusSchema.parse(req.body);
      const item = await storage.updateInventoryStatus(req.params.id, stockStatus);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update inventory status");
    }
  });

  app.post("/api/inventory/:id/use-container", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.useOneContainer(req.params.id);
      if (!item) return res.status(404).json({ message: "Inventory item not found" });
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update container count");
    }
  });

}
