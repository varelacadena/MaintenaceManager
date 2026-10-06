import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";
import { getCurrentUser } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { storage } from "../storage";
import { getLifeSafetyChecks } from "../storage/lifeSafety";
import {
  loadLifeSafetyCheckForTask,
  recordLifeSafetyPass,
  recordLifeSafetyProblem,
} from "../lifeSafetyRounds";

async function canRecordLifeSafety(taskId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "technician") return false;
  const task = await storage.getTask(taskId);
  if (!task?.lifeSafetyRound) return false;
  if (task.assignedToId === userId) return true;
  if (await storage.isTaskHelper(taskId, userId)) return true;
  return task.executorType === "technician" && task.assignedPool === "technician_pool";
}

export function registerLifeSafetyRoutes(app: Express) {
  app.get("/api/tasks/:id/life-safety-checks", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      if (!task.lifeSafetyRound) return res.json([]);
      const checks = await getLifeSafetyChecks(task.id);
      res.json(checks);
    } catch (error) {
      handleRouteError(res, error, "Failed to load life safety checks");
    }
  });

  app.post("/api/tasks/:taskId/life-safety-checks/:checkId/pass", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ message: "User not found" });
      const allowed = await canRecordLifeSafety(req.params.taskId, user.id, user.role);
      if (!allowed) return res.status(403).json({ message: "You cannot record checks on this task" });

      const body = z.object({ scan: z.string().min(1) }).parse(req.body);
      const check = await loadLifeSafetyCheckForTask(req.params.taskId, req.params.checkId);
      if (!check) return res.status(404).json({ message: "Check not found" });

      const updated = await recordLifeSafetyPass(check, body.scan, user);
      res.json(updated);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status) return res.status(status).json({ message: error instanceof Error ? error.message : "Failed to record check" });
      handleRouteError(res, error, "Failed to record check");
    }
  });

  app.post("/api/tasks/:taskId/life-safety-checks/:checkId/problem", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) return res.status(401).json({ message: "User not found" });
      const allowed = await canRecordLifeSafety(req.params.taskId, user.id, user.role);
      if (!allowed) return res.status(403).json({ message: "You cannot record checks on this task" });

      const body = z.object({ note: z.string().min(3) }).parse(req.body);
      const check = await loadLifeSafetyCheckForTask(req.params.taskId, req.params.checkId);
      if (!check) return res.status(404).json({ message: "Check not found" });

      const updated = await recordLifeSafetyProblem(check, body.note, user);
      res.json(updated);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status) return res.status(status).json({ message: error instanceof Error ? error.message : "Failed to record problem" });
      handleRouteError(res, error, "Failed to record problem");
    }
  });
}
