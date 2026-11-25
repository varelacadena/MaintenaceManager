import type { Express } from "express";
import { insertEmergencyContactSchema } from "@shared/schema";
import { requireAdmin } from "../middleware";
import { isAuthenticated } from "../replitAuth";
import { handleRouteError } from "../routeUtils";
import { storage } from "../storage";

export function registerEmergencyContactRoutes(app: Express) {
  app.get("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contacts = await storage.getEmergencyContacts();
      res.json(contacts);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch emergency contacts");
    }
  });

  app.get("/api/emergency-contacts/active", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getActiveEmergencyContact();
      res.json(contact || null);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch active emergency contact");
    }
  });

  app.get("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.getEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch emergency contact");
    }
  });

  app.post("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertEmergencyContactSchema.parse({
        ...req.body,
        assignedById: req.userId,
      });

      const contact = await storage.createEmergencyContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to create emergency contact");
    }
  });

  app.patch("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertEmergencyContactSchema.partial().parse(req.body);
      const contact = await storage.updateEmergencyContact(req.params.id, validated);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to update emergency contact");
    }
  });

  app.post("/api/emergency-contacts/:id/activate", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.setActiveEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to activate emergency contact");
    }
  });

  app.post("/api/emergency-contacts/clear-active", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.clearActiveEmergencyContact();
      res.json({ message: "Active emergency contact cleared" });
    } catch (error) {
      handleRouteError(res, error, "Failed to clear active emergency contact");
    }
  });

  app.delete("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmergencyContact(req.params.id);
      res.json({ message: "Emergency contact deleted" });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete emergency contact");
    }
  });
}
