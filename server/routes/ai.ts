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
