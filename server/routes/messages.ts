import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTaskExecutorOrAdmin, requireTaskAccess, canAccessTask } from "../middleware";
import { handleRouteError, canAccessServiceRequest } from "../routeUtils";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export function registerMessageRoutes(app: Express) {
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
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
        const hasRequestAccess = await canAccessServiceRequest(userId, req.body.requestId);
        if (!hasRequestAccess && currentUser.role !== "admin") {
          return res.status(403).json({ message: "You don't have access to this request" });
        }
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      handleRouteError(res, error, "Failed to create message");
    }
  });

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch messages");
    }
  });

  app.get("/api/messages/request/:requestId", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByRequest(
        req.params.requestId
      );
      res.json(messages);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch messages");
    }
  });

  app.post("/api/messages/request/:requestId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      await storage.markMessagesAsRead(req.params.requestId, userId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to mark messages as read");
    }
  });

  app.get(
    "/api/messages/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const messages = await storage.getMessagesByTask(
          req.params.taskId
        );
        res.json(messages);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch messages");
      }
    }
  );

  app.post("/api/messages/task/:taskId/mark-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      await storage.markTaskMessagesAsRead(req.params.taskId, userId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to mark task messages as read");
    }
  });

  app.delete("/api/messages/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete message");
    }
  });
}
