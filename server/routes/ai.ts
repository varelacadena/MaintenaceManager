import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError, getAuthUser } from "../routeUtils";
import {
  insertAvailabilityScheduleSchema,
  insertUserSkillSchema,
  insertTaskDependencySchema,
  insertSlaConfigSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerAiRoutes(app: Express) {
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

  // ─── AI Agent Logs ────────────────────────────────────────────────────────
  app.get("/api/ai-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, entityType, limit } = req.query;
      const logs = await storage.getAiAgentLogs({
        status: status as string,
        entityType: entityType as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch AI logs");
    }
  });

  app.patch("/api/ai-logs/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const aiLogSchema = z.object({ status: z.enum(["approved", "rejected"]) });
      const { status } = aiLogSchema.parse(req.body);
      const log = await storage.updateAiAgentLog(req.params.id, { status, reviewedBy: user.id });
      if (!log) return res.status(404).json({ message: "Log not found" });

      if (status === "approved") {
        const { aiAgent } = await import("../aiAgent");
        await aiAgent.applyApprovedAction(log);
      }

      res.json(log);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to update AI log");
    }
  });

  // ─── AI Triage trigger ────────────────────────────────────────────────────
  app.post("/api/ai/triage/:requestId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const request = await storage.getServiceRequest(req.params.requestId);
      if (!request) return res.status(404).json({ message: "Request not found" });
      const { aiAgent } = await import("../aiAgent");
      const log = await aiAgent.triageServiceRequest(request);
      res.json(log);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to run AI triage");
    }
  });

  // ─── AI Schedule suggestion ───────────────────────────────────────────────
  app.post("/api/ai/schedule/:taskId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      const { aiAgent } = await import("../aiAgent");
      const log = await aiAgent.suggestTaskSchedule(task);
      res.json(log);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to generate schedule suggestion");
    }
  });

  // ─── AI Project schedule ──────────────────────────────────────────────────
  app.post("/api/ai/project-schedule/:projectId", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const { aiAgent } = await import("../aiAgent");
      const logs = await aiAgent.scheduleProject(req.params.projectId);
      res.json(logs);
    } catch (error: any) {
      handleRouteError(res, error, "Failed to generate project schedule");
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

  // ─── AI Stats ─────────────────────────────────────────────────────────────
  app.get("/api/ai-stats", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allLogs = await storage.getAiAgentLogs({});
      const pending = allLogs.filter((l: any) => l.status === "pending_review").length;
      const approved = allLogs.filter((l: any) => l.status === "approved").length;
      const rejected = allLogs.filter((l: any) => l.status === "rejected").length;
      const autoApplied = allLogs.filter((l: any) => l.status === "auto_applied").length;
      const total = allLogs.length;
      const acceptanceRate = (approved + autoApplied) > 0 ? Math.round(((approved + autoApplied) / Math.max(total - pending, 1)) * 100) : 0;
      const pendingLogs = allLogs.filter((l: any) => l.status === "pending_review");
      const pendingByAction: Record<string, number> = {};
      for (const log of pendingLogs) {
        const action = (log as any).action || "other";
        pendingByAction[action] = (pendingByAction[action] || 0) + 1;
      }
      res.json({ pending, approved, rejected, autoApplied, total, acceptanceRate, pendingByAction });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch AI stats");
    }
  });
}
