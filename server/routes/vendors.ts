import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { insertVendorSchema } from "@shared/schema";
import { z } from "zod";

export function registerVendorRoutes(app: Express) {
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch vendors");
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
      handleRouteError(res, error, "Failed to fetch vendor");
    }
  });

  app.post("/api/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.json(vendor);
    } catch (error) {
      handleRouteError(res, error, "Failed to create vendor");
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(req.params.id, vendorData);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      handleRouteError(res, error, "Failed to update vendor");
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete vendor");
    }
  });
}
