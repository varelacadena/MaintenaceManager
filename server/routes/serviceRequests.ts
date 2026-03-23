import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, getCurrentUser } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { notificationService, notifyNewServiceRequest } from "../notifications";
import { insertServiceRequestSchema } from "@shared/schema";
import { z } from "zod";

export function registerServiceRequestRoutes(app: Express) {
  app.get("/api/service-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      let filters: any = {};

      if (currentUser?.role === "staff" || currentUser?.role === "technician" || currentUser?.role === "student") {
        filters.userId = userId;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      const requests = await storage.getServiceRequests(filters);
      res.json(requests);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch service requests");
    }
  });

  app.get(
    "/api/service-requests/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const currentUser = await storage.getUser(userId);
        const request = await storage.getServiceRequest(req.params.id);

        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        if (["staff", "technician", "student"].includes(currentUser?.role ?? "") && request.requesterId !== userId) {
          return res.status(403).json({ message: "Forbidden: Cannot view this request" });
        }

        res.json(request);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch service request");
      }
    }
  );

  app.post("/api/service-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        requesterId: userId,
        requestedDate: req.body.requestedDate ? new Date(req.body.requestedDate) : undefined,
      });
      const request = await storage.createServiceRequest(requestData);

      const requester = await storage.getUser(userId);
      if (requester) {
        const admins = await storage.getUsersByRoles(["admin"]);
        notifyNewServiceRequest(request, requester, admins, notificationService).catch(err =>
          console.error("Failed to send service request notification emails:", err)
        );
      }

      res.json(request);
    } catch (error) {
      handleRouteError(res, error, "Failed to create service request");
    }
  });

  app.patch("/api/service-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const request = await storage.getServiceRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.requesterId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Cannot edit this request" });
      }

      const validated = insertServiceRequestSchema.partial().parse(req.body);
      const updatedRequest = await storage.updateServiceRequest(req.params.id, validated);
      res.json(updatedRequest);
    } catch (error) {
      handleRouteError(res, error, "Failed to update service request");
    }
  });

  app.delete("/api/service-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const request = await storage.getServiceRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const canDelete =
        request.requesterId === userId ||
        currentUser?.role === "admin";

      if (!canDelete) {
        return res.status(403).json({ message: "Forbidden: Cannot delete this request" });
      }

      await storage.deleteServiceRequest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete service request");
    }
  });

  app.patch(
    "/api/service-requests/:id/status",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const reqStatusSchema = z.object({
          status: z.string().min(1),
          rejectionReason: z.string().optional(),
        });
        const { status, rejectionReason } = reqStatusSchema.parse(req.body);

        const request = await storage.updateServiceRequestStatus(
          req.params.id,
          status,
          rejectionReason
        );

        res.json(request);
      } catch (error) {
        handleRouteError(res, error, "Failed to update service request status");
      }
    }
  );
}
