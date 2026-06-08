import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { handleRouteError } from "../routeUtils";
import { toTaskListSummary } from "../taskDto";

async function buildAiStats() {
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
  return {
    ...stats,
    acceptanceRate: stats.total > 0 ? Math.round((accepted / stats.total) * 100) : 0,
    pendingByAction,
  };
}

async function fetchWorkTasksForAdmin() {
  const recentCompletedAfter = new Date();
  recentCompletedAfter.setDate(recentCompletedAfter.getDate() - 30);
  const tasks = await storage.getTasks({ recentCompletedAfter });
  const helperCounts = await storage.getHelperCountsByTaskIds(tasks.map((t) => t.id));
  return tasks.map((task) =>
    toTaskListSummary({ ...task, helperCount: helperCounts[task.id] ?? 0 }),
  );
}

async function fetchAssignedTasks(userId: string) {
  const tasks = await storage.getTasks({ assignedToId: userId });
  return tasks.map((task) => toTaskListSummary(task));
}

async function fetchDirectoryUsers() {
  const users = await storage.getAllUsers();
  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    username: user.username,
    email: user.email,
  }));
}

export function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const role = currentUser.role;
      const userId = req.userId;

      if (role === "staff") {
        const [requests, vehicleReservations] = await Promise.all([
          storage.getServiceRequests({ limit: 5 }),
          storage.getVehicleReservations({ userId }),
        ]);
        return res.json({ requests, vehicleReservations });
      }

      if (role === "technician" || role === "student") {
        const [tasks, users, properties] = await Promise.all([
          role === "student"
            ? storage.getTasks({ assignedToIdOrPool: { userId, pool: "student_pool" } }).then((rows) =>
                rows.map((task) => toTaskListSummary(task)),
              )
            : fetchAssignedTasks(userId),
          fetchDirectoryUsers(),
          storage.getProperties(),
        ]);
        return res.json({ tasks, users, properties });
      }

      if (role === "admin") {
        const [tasks, requests, users, properties, vehicleReservations, projects, aiStats] =
          await Promise.all([
            fetchWorkTasksForAdmin(),
            storage.getServiceRequests({ limit: 5 }),
            fetchDirectoryUsers(),
            storage.getProperties(),
            storage.getVehicleReservations({ userId }),
            storage.getProjects(),
            buildAiStats(),
          ]);
        return res.json({
          tasks,
          requests,
          users,
          properties,
          vehicleReservations,
          projects,
          aiStats,
        });
      }

      res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch dashboard");
    }
  });
}
