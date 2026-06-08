import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import {
  insertAvailabilityScheduleSchema,
  insertUserSkillSchema,
  insertTaskDependencySchema,
  insertSlaConfigSchema,
} from "@shared/schema";

export function registerAiRoutes(app: Express) {
  app.get("/api/ai-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, entityType, limit } = req.query;
      const logs = await storage.getAiAgentLogs({
        status: typeof status === "string" ? status : undefined,
        entityType: typeof entityType === "string" ? entityType : undefined,
        limit: typeof limit === "string" ? Number.parseInt(limit, 10) || undefined : undefined,
      });
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch AI logs");
    }
  });

  app.get("/api/ai-stats", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const logs = await storage.getAiAgentLogs();
      const pendingByAction: Record<string, number> = {};
      const stats = logs.reduce(
        (acc, log) => {
          acc.total += 1;
          if (log.status === "pending_review") {
            acc.pending += 1;
            pendingByAction[log.action] = (pendingByAction[log.action] ?? 0) + 1;
          } else if (log.status === "approved") {
            acc.approved += 1;
          } else if (log.status === "rejected") {
            acc.rejected += 1;
          } else if (log.status === "auto_applied") {
            acc.autoApplied += 1;
          }
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0, autoApplied: 0, total: 0 },
      );
      const accepted = stats.approved + stats.autoApplied;
      res.json({
        ...stats,
        acceptanceRate: stats.total > 0 ? Math.round((accepted / stats.total) * 100) : 0,
        pendingByAction,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch AI stats");
    }
  });

  app.patch("/api/ai-logs/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (status !== "approved" && status !== "rejected") {
        return res.status(400).json({ message: "Status must be approved or rejected" });
      }
      const updated = await storage.updateAiAgentLog(req.params.id, {
        status,
        reviewedBy: req.currentUser?.id,
      });
      if (!updated) {
        return res.status(404).json({ message: "AI log not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update AI log");
    }
  });

  // ─── Availability Schedules ──────────────────────────────────────────────
  app.get("/api/users/:id/availability", isAuthenticated, async (req, res) => {
    try {
      const schedules = await storage.getUserAvailability(req.params.id);
      res.json(schedules);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch availability");
    }
  });

  app.put("/api/users/:id/availability", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules)) return res.status(400).json({ message: "schedules must be an array" });
      const parsed = schedules.map((s: any) => insertAvailabilityScheduleSchema.parse({ ...s, userId: req.params.id }));
      const result = await storage.upsertUserAvailability(req.params.id, parsed);
      res.json(result);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update availability");
    }
  });

  // ─── User Skills ──────────────────────────────────────────────────────────
  app.get("/api/users/:id/skills", isAuthenticated, async (req, res) => {
    try {
      const skills = await storage.getUserSkills(req.params.id);
      res.json(skills);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch skills");
    }
  });

  app.post("/api/users/:id/skills", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertUserSkillSchema.parse({ ...req.body, userId: req.params.id });
      const skill = await storage.createUserSkill(data);
      res.status(201).json(skill);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to create skill");
    }
  });

  app.delete("/api/users/:id/skills/:skillId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteUserSkill(req.params.skillId);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete skill");
    }
  });

  // ─── Task Dependencies ────────────────────────────────────────────────────
  app.get("/api/tasks/:id/dependencies", isAuthenticated, async (req, res) => {
    try {
      const deps = await storage.getTaskDependencies(req.params.id);
      res.json(deps);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch dependencies");
    }
  });

  app.post("/api/tasks/:id/dependencies", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertTaskDependencySchema.parse({ ...req.body, taskId: req.params.id });
      const dep = await storage.createTaskDependency(data);
      res.status(201).json(dep);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to create dependency");
    }
  });

  app.delete("/api/tasks/:id/dependencies/:depId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteTaskDependency(req.params.depId);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete dependency");
    }
  });

  // ─── SLA Configs ──────────────────────────────────────────────────────────
  app.get("/api/sla-configs", isAuthenticated, async (req, res) => {
    try {
      const configs = await storage.getSlaConfigs();
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch SLA configs");
    }
  });

  app.put("/api/sla-configs/:urgencyLevel", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { responseHours, resolutionHours } = req.body;
      if (typeof responseHours !== "number" || typeof resolutionHours !== "number") {
        return res.status(400).json({ message: "responseHours and resolutionHours must be numbers" });
      }
      const config = await storage.upsertSlaConfig(req.params.urgencyLevel, { responseHours, resolutionHours });
      res.json(config);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update SLA config");
    }
  });

  // ─── Equipment PM schedule ────────────────────────────────────────────────
  app.get("/api/equipment/:id/pm-schedule", isAuthenticated, async (req, res) => {
    try {
      const eq = await storage.getEquipmentItem(req.params.id);
      if (!eq) return res.status(404).json({ message: "Equipment not found" });
      const allTasks = await storage.getTasks();
      const tasks = allTasks.filter((t: any) => t.equipmentId === req.params.id);
      const completedTasks = tasks.filter((t: any) => t.status === "completed");
      completedTasks.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      const lastCompleted = completedTasks[0];
      const intervalDays = (eq as any).maintenanceIntervalDays || 90;
      const projectedDates: string[] = [];
      const baseDate = lastCompleted?.updatedAt ? new Date(lastCompleted.updatedAt) : new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + intervalDays * i);
        projectedDates.push(d.toISOString());
      }
      res.json({ equipmentId: req.params.id, intervalDays, lastCompleted: lastCompleted?.updatedAt || null, projectedDates });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch PM schedule");
    }
  });

}
