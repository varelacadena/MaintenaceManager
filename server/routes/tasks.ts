import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTechnicianOrAdmin, requireTaskExecutorOrAdmin, requireTaskAccess, canAccessTask, getCurrentUser } from "../middleware";
import { handleRouteError, syncProjectStatusFromTasks, getAuthUser } from "../routeUtils";
import { handleFacilityRouteError } from "../routeFacilityError";
import { validateTaskLocation } from "../facilityValidation";
import { touchPropertyLastWorkFromTask } from "../propertyMaintenance";
import { notificationService, notifyTaskCreated, notifyStatusChange, notifyTaskAssigned } from "../notifications";
import { insertTaskSchema, insertPartUsedSchema, insertTaskNoteSchema, partsUsed } from "@shared/schema";
import { resolvePartLineCost } from "../inventoryPartCost";
import { redactPartsUsedForRole } from "../inventoryDto";
import { z } from "zod";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { toTaskListSummary } from "../taskDto";

export function registerTaskRoutes(app: Express) {
  const fieldJobSchema = z.object({
    name: z.string().trim().min(1, "Job name is required").max(200, "Job name is too long"),
    description: z.string().trim().min(1, "Description is required"),
    urgency: z.enum(["low", "medium", "high"]).default("medium"),
    propertyId: z.string().trim().min(1, "Property is required"),
    spaceId: z.string().trim().optional().or(z.literal("")),
    equipmentId: z.string().trim().optional().or(z.literal("")),
    vehicleId: z.string().trim().optional().or(z.literal("")),
    areaId: z.string().trim().optional().or(z.literal("")),
  });

  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = req.currentUser ?? await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot access tasks" });
      }

      const equipmentIdFilter = req.query.equipmentId as string | undefined;

      if (
        equipmentIdFilter &&
        currentUser.role !== "admin" &&
        currentUser.role !== "technician"
      ) {
        return res.status(403).json({ message: "Forbidden: Equipment work history is restricted" });
      }

      let filters: any = {};

      if (!equipmentIdFilter) {
        if (currentUser.role === "student") {
          filters.assignedToIdOrPool = { userId, pool: "student_pool" };
        } else if (currentUser.role === "technician") {
          filters.assignedToId = userId;
        }
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.assignedToId && currentUser.role === "admin") {
        filters.assignedToId = req.query.assignedToId;
      }
      if (req.query.assignedVendorId) {
        filters.assignedVendorId = req.query.assignedVendorId;
      }
      if (req.query.areaId) {
        filters.areaId = req.query.areaId;
      }
      if (req.query.executorType && currentUser.role === "admin") {
        filters.executorType = req.query.executorType;
      }
      if (equipmentIdFilter) {
        filters.equipmentId = equipmentIdFilter;
      }
      if (req.query.propertyId) {
        filters.propertyId = req.query.propertyId as string;
      }
      if (req.query.taskIds) {
        filters.taskIds = String(req.query.taskIds)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
      if (req.query.dateFrom) {
        const dateFrom = new Date(String(req.query.dateFrom));
        if (!Number.isNaN(dateFrom.getTime())) {
          filters.dateFrom = dateFrom;
        }
      }
      if (req.query.dateTo) {
        const dateTo = new Date(String(req.query.dateTo));
        if (!Number.isNaN(dateTo.getTime())) {
          filters.dateTo = dateTo;
        }
      }
      if (req.query.excludeCompleted === "true") {
        filters.excludeCompleted = true;
      }
      if (req.query.view === "work" && currentUser.role === "admin") {
        const recentCompletedAfter = new Date();
        recentCompletedAfter.setDate(recentCompletedAfter.getDate() - 30);
        filters.recentCompletedAfter = recentCompletedAfter;
      }
      if (req.query.limit) {
        const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit), 10) || 100, 1), 500);
        filters.limit = limit;
      }
      if (req.query.offset) {
        filters.offset = Math.max(Number.parseInt(String(req.query.offset), 10) || 0, 0);
      }

      let allTasks = await storage.getTasks(filters);

      if ((currentUser.role === "student" || currentUser.role === "technician") && !equipmentIdFilter) {
        const helperTaskIds = await storage.getHelperTaskIds(userId);
        if (helperTaskIds.length > 0) {
          const helperFilters: any = { taskIds: helperTaskIds };
          if (req.query.status) helperFilters.status = req.query.status as string;
          if (req.query.areaId) helperFilters.areaId = req.query.areaId as string;
          if (filters.dateFrom) helperFilters.dateFrom = filters.dateFrom;
          if (filters.dateTo) helperFilters.dateTo = filters.dateTo;
          if (filters.excludeCompleted) helperFilters.excludeCompleted = true;
          const helperTasks = await storage.getTasks(helperFilters);
          const helperFiltered = helperTasks
            .filter(t => !allTasks.some(at => at.id === t.id));
          const tagged = helperFiltered.map(t => ({ ...t, isHelper: true as const }));
          allTasks = [...allTasks, ...tagged];
        }
      }

      const useSummary = req.query.summary === "true";

      if (currentUser.role === "admin" || currentUser.role === "technician") {
        const helperCounts = await storage.getHelperCountsByTaskIds(allTasks.map((t) => t.id));
        const tasksWithHelperCount = allTasks.map((t) => ({
          ...t,
          helperCount: helperCounts[t.id] ?? 0,
        }));
        return res.json(
          useSummary ? tasksWithHelperCount.map((task) => toTaskListSummary(task)) : tasksWithHelperCount,
        );
      }

      res.json(useSummary ? allTasks.map((task) => toTaskListSummary(task)) : allTasks);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch tasks");
    }
  });

  app.get("/api/tasks/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = req.currentUser;
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      if (currentUser.role !== "student" && currentUser.role !== "technician") {
        return res.status(403).json({ message: "Only students and technicians can browse available jobs" });
      }
      const pool = currentUser.role === "student" ? "student_pool" : "technician_pool";
      const availableTasks = await storage.getAvailablePoolTasks(pool);
      res.json(availableTasks);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch available tasks");
    }
  });

  app.get("/api/tasks/available/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      if (currentUser.role !== "student" && currentUser.role !== "technician") {
        return res.json({ count: 0 });
      }
      const pool = currentUser.role === "student" ? "student_pool" : "technician_pool";
      const count = await storage.getAvailablePoolTaskCount(pool);
      res.json({ count });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch available task count");
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const hasAccess = await canAccessTask(userId, task.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }

      const helpers = await storage.getTaskHelpers(task.id);
      const helperUsersById = new Map(
        (await storage.getUsersByIds(helpers.map((h) => h.userId))).map((user) => [user.id, user])
      );
      const helperUsers = helpers.map((h) => {
        const user = helperUsersById.get(h.userId);
        return user ? { id: h.id, userId: h.userId, taskId: h.taskId, assignedAt: h.assignedAt, user: { id: user.id, name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username, email: user.email, role: user.role } } : null;
      });
      const isHelper = (currentUser.role === "student" || currentUser.role === "technician")
        ? await storage.isTaskHelper(task.id, userId)
        : false;
      res.json({ ...task, helpers: helperUsers.filter(Boolean), isHelper });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch task");
    }
  });

  app.get("/api/tasks/:id/detail", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskId = req.params.id;
      const hasAccess = await canAccessTask(userId, taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const [helpers, subtasks, taskUploads, parts, timeEntries, notes] = await Promise.all([
        storage.getTaskHelpers(taskId),
        storage.getSubTasks(taskId),
        storage.getUploadsByTask(taskId),
        storage.getPartsByTask(taskId),
        storage.getTimeEntriesByTask(taskId),
        storage.getNotesByTask(taskId),
      ]);

      const [helperUsers, subtaskUploadArrays] = await Promise.all([
        storage.getUsersByIds(helpers.map((h) => h.userId)),
        Promise.all(subtasks.map((subtask) => storage.getUploadsByTask(subtask.id))),
      ]);
      const helperUsersById = new Map(helperUsers.map((user) => [user.id, user]));
      const helpersWithUsers = helpers
        .map((h) => {
          const user = helperUsersById.get(h.userId);
          return user
            ? {
                id: h.id,
                userId: h.userId,
                taskId: h.taskId,
                assignedAt: h.assignedAt,
                user: {
                  id: user.id,
                  name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
                  email: user.email,
                  role: user.role,
                },
              }
            : null;
        })
        .filter(Boolean);
      const role = req.currentUser?.role as string | undefined;

      res.json({
        task: {
          ...task,
          helpers: helpersWithUsers,
          isHelper: (role === "student" || role === "technician") ? await storage.isTaskHelper(task.id, userId) : false,
        },
        subtasks,
        uploads: [...taskUploads, ...subtaskUploadArrays.flat()],
        parts: redactPartsUsedForRole(parts, role),
        timeEntries,
        notes,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch task detail");
    }
  });

  app.post("/api/tasks/field-job", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = req.currentUser ?? await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      if (currentUser.role !== "technician") {
        return res.status(403).json({ message: "Only technicians can add field jobs" });
      }

      const payload = fieldJobSchema.parse(req.body);
      const today = new Date();
      const taskData = insertTaskSchema.parse({
        name: payload.name,
        description: payload.description,
        urgency: payload.urgency,
        propertyId: payload.propertyId,
        spaceId: payload.spaceId || undefined,
        equipmentId: payload.equipmentId || undefined,
        vehicleId: payload.vehicleId || undefined,
        areaId: payload.areaId || undefined,
        assignedToId: userId,
        assignedVendorId: undefined,
        taskType: "one_time",
        executorType: "technician",
        assignedPool: null,
        status: "not_started",
        createdById: userId,
        initialDate: today,
        estimatedCompletionDate: today,
        requiresPhoto: false,
        requiresEstimate: false,
        estimateStatus: "none",
      });

      await validateTaskLocation({
        propertyId: taskData.propertyId,
        spaceId: taskData.spaceId,
        equipmentId: taskData.equipmentId,
      });

      const task = await storage.createTask(taskData);
      const displayName = currentUser.firstName && currentUser.lastName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.username;

      try {
        await storage.createTaskNote({
          taskId: task.id,
          userId,
          content: `Field job added by ${displayName}`,
          noteType: "job_note",
        });
      } catch (noteError) {
        console.error("Failed to create field job note:", noteError);
      }

      res.status(201).json(task);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to add field job");
    }
  });

  app.post("/api/tasks", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { checklistGroups, helperUserIds, ...taskPayload } = req.body;
      
      const effectiveExecutorType = taskPayload.executorType || "technician";
      const hasDirectAssignee = !!taskPayload.assignedToId || !!taskPayload.assignedVendorId;
      const effectivePool = hasDirectAssignee 
        ? null 
        : (taskPayload.assignedPool || (effectiveExecutorType === "student" ? "student_pool" : "technician_pool"));

      const taskData = insertTaskSchema.parse({
        ...taskPayload,
        createdById: userId,
        executorType: effectiveExecutorType,
        assignedPool: effectivePool,
        initialDate: taskPayload.initialDate ? new Date(taskPayload.initialDate) : new Date(),
        estimatedCompletionDate: taskPayload.estimatedCompletionDate ? new Date(taskPayload.estimatedCompletionDate) : undefined,
      });

      await validateTaskLocation({
        propertyId: taskData.propertyId,
        spaceId: taskData.spaceId,
        equipmentId: taskData.equipmentId,
        propertyIds: taskData.propertyIds,
      });

      const checklistGroupSchema = z.array(z.object({
        name: z.string().min(1, "Checklist name is required"),
        sortOrder: z.number().optional(),
        items: z.array(z.object({
          text: z.string().min(1, "Checklist item text is required"),
          isCompleted: z.boolean().optional().default(false),
          sortOrder: z.number().optional(),
        })),
      })).optional();

      const validatedGroups = checklistGroupSchema.parse(checklistGroups);

      let task;
      
      if (validatedGroups && validatedGroups.length > 0) {
        const result = await storage.createTaskWithChecklistGroups(taskData, validatedGroups);
        task = result.task;
      } else {
        task = await storage.createTask(taskData);
      }

      if (helperUserIds && Array.isArray(helperUserIds)) {
        for (const hId of helperUserIds) {
          await storage.addTaskHelper(task.id, hId);
        }
      }

      if (task.projectId) {
        await syncProjectStatusFromTasks(task.projectId);
      }

      if (task.requestId) {
        try {
          await storage.updateServiceRequestStatus(task.requestId, 'converted_to_task');
        } catch (err) {
          console.error("Error updating request status:", err);
        }
      }

      try {
        const admins = await storage.getUsersByRoles(["admin"]);
        if (task.requestId) {
          const linkedRequest = await storage.getServiceRequest(task.requestId);
          const requester = task.createdById ? await storage.getUser(task.createdById) : null;
          if (linkedRequest && requester) {
            notifyTaskCreated(linkedRequest, requester, admins, notificationService).catch(err =>
              console.error("Failed to send task created notification:", err)
            );
          }
        }
        const assignedUserIds = [
          task.assignedToId,
          ...(Array.isArray(helperUserIds) ? helperUserIds : []),
        ].filter((id, index, ids): id is string => !!id && ids.indexOf(id) === index);
        if (assignedUserIds.length > 0) {
          const fakeRequest = {
            title: task.name,
            description: task.description,
            urgency: task.urgency,
          } as any;
          const assignedUsers = await storage.getUsersByIds(assignedUserIds);
          for (const assignedUser of assignedUsers) {
            notifyTaskAssigned(fakeRequest, assignedUser, notificationService).catch(err =>
              console.error("Failed to send task assigned notification:", err)
            );
          }
        }
      } catch (notifyErr) {
        console.error("Notification error after task creation:", notifyErr);
      }

      res.json(task);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to create task");
    }
  });

  app.post("/api/tasks/:id/claim", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      if (currentUser.role !== "student" && currentUser.role !== "technician") {
        return res.status(403).json({ message: "Only students and technicians can claim tasks" });
      }

      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const pool = currentUser.role === "student" ? "student_pool" : "technician_pool";
      if (existingTask.assignedPool !== pool) {
        return res.status(403).json({ message: "This task is not in your pool" });
      }

      const claimedTask = await storage.claimTask(req.params.id, userId, pool);
      if (!claimedTask) {
        return res.status(409).json({ message: "This job has already been claimed by someone else" });
      }

      const displayName = currentUser.firstName && currentUser.lastName
        ? `${currentUser.firstName} ${currentUser.lastName[0]}.`
        : currentUser.username;

      try {
        await storage.createTaskNote({
          taskId: req.params.id,
          userId: userId,
          content: `Claimed by ${displayName}`,
          noteType: "job_note",
        });
      } catch (noteError) {
        console.error("Failed to create claim activity note:", noteError);
      }

      res.json(claimedTask);
    } catch (error) {
      handleRouteError(res, error, "Failed to claim task");
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (currentUser.role === "technician" || currentUser.role === "student") {
        const task = await storage.getTask(req.params.id);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        
        if (task.parentTaskId) {
          const isStructuralEdit = req.body.name !== undefined || req.body.description !== undefined;
          if (isStructuralEdit) {
            return res.status(403).json({ message: "Only admins can rename or modify subtasks" });
          }
        }

        if (currentUser.role === "technician") {
          const directlyAssigned = task.assignedToId === userId;
          const isAdditionalAssignee = await storage.isTaskHelper(task.id, userId);
          const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
          if (!directlyAssigned && !isAdditionalAssignee && !inPool) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
        }
        
        if (currentUser.role === "student") {
          const isHelper = await storage.isTaskHelper(task.id, userId);
          if (isHelper) {
            return res.status(403).json({ message: "Forbidden: Helpers cannot modify task details" });
          }
          const directlyAssigned = task.assignedToId === userId;
          const inPool = task.executorType === "student" && task.assignedPool === "student_pool";
          if (!directlyAssigned && !inPool) {
            return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
          }
          if (req.body.assignedToId !== undefined) {
            return res.status(403).json({ message: "Forbidden: Students cannot reassign tasks" });
          }
        }
      }

      const { helperUserIds: patchHelperIds, ...restBody } = req.body;

      const locationFields = ["propertyId", "spaceId", "equipmentId", "propertyIds"];
      if (
        currentUser.role !== "admin" &&
        locationFields.some((field) => restBody[field] !== undefined)
      ) {
        return res.status(403).json({ message: "Only admins can change task location fields" });
      }

      if (currentUser?.role === "admin" && patchHelperIds !== undefined && Array.isArray(patchHelperIds)) {
        const existingHelpers = await storage.getTaskHelpers(req.params.id);
        const existingUserIds = existingHelpers.map(h => h.userId);
        const toAdd = patchHelperIds.filter((id: string) => !existingUserIds.includes(id));
        const toRemove = existingUserIds.filter(id => !patchHelperIds.includes(id));
        for (const id of toAdd) await storage.addTaskHelper(req.params.id, id);
        for (const id of toRemove) await storage.removeTaskHelper(req.params.id, id);
      }

      const updateData: any = { ...restBody };

      const needsPoolSync = updateData.assignedToId !== undefined || updateData.assignedVendorId !== undefined || updateData.executorType !== undefined;
      if (needsPoolSync) {
        const existingTask = await storage.getTask(req.params.id);
        const newAssignedToId = updateData.assignedToId !== undefined ? updateData.assignedToId : existingTask?.assignedToId;
        const newAssignedVendorId = updateData.assignedVendorId !== undefined ? updateData.assignedVendorId : existingTask?.assignedVendorId;
        const hasDirectAssignee = !!newAssignedToId || !!newAssignedVendorId;
        
        if (hasDirectAssignee) {
          updateData.assignedPool = null;
        } else {
          const execType = updateData.executorType || existingTask?.executorType || "technician";
          updateData.assignedPool = execType === "student" ? "student_pool" : "technician_pool";
        }
      }

      if (updateData.status === "ready") {
        updateData.status = "not_started";
      }

      if (updateData.status === "completed") {
        const currentTask = await storage.getTask(req.params.id);
        if (currentTask?.requiresEstimate) {
          const taskQuotes = await storage.getQuotesByTaskId(req.params.id);
          if (taskQuotes.length === 0) {
            return res.status(400).json({ message: "Submit an estimate before completing this task" });
          }
          if (currentTask.estimateStatus !== "approved") {
            return res.status(400).json({ message: "Estimates must be approved before completing this task" });
          }
        }
      }

      if (updateData.actualCompletionDate) {
        updateData.actualCompletionDate = new Date(updateData.actualCompletionDate);
      }
      if (updateData.initialDate) {
        updateData.initialDate = new Date(updateData.initialDate);
      }
      if (updateData.estimatedCompletionDate) {
        updateData.estimatedCompletionDate = new Date(updateData.estimatedCompletionDate);
      }

      if (
        updateData.propertyId !== undefined ||
        updateData.spaceId !== undefined ||
        updateData.equipmentId !== undefined ||
        updateData.propertyIds !== undefined
      ) {
        const existingTask = await storage.getTask(req.params.id);
        await validateTaskLocation({
          propertyId: updateData.propertyId ?? existingTask?.propertyId,
          spaceId: updateData.spaceId ?? existingTask?.spaceId,
          equipmentId: updateData.equipmentId ?? existingTask?.equipmentId,
          propertyIds: updateData.propertyIds ?? existingTask?.propertyIds,
        });
      }

      const task = await storage.updateTask(req.params.id, updateData);

      if (task?.projectId) {
        await syncProjectStatusFromTasks(task.projectId);
      }

      if (task?.status === "completed") {
        await touchPropertyLastWorkFromTask(task);
      }

      res.json(task);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to update task");
    }
  });

  app.get("/api/tasks/:id/helpers", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const hasAccess = await canAccessTask(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const helpers = await storage.getTaskHelpers(req.params.id);
      const helperUsers = await Promise.all(
        helpers.map(async (h) => {
          const user = await storage.getUser(h.userId);
          return user ? { ...h, user: { id: user.id, name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username, email: user.email, role: user.role } } : null;
        })
      );
      res.json(helperUsers.filter(Boolean));
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch task helpers");
    }
  });

  app.post("/api/tasks/:id/helpers", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId: helperUserId } = req.body;
      if (!helperUserId) {
        return res.status(400).json({ message: "userId is required" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const helper = await storage.addTaskHelper(req.params.id, helperUserId);
      res.json(helper);
    } catch (error) {
      handleRouteError(res, error, "Failed to add task helper");
    }
  });

  app.delete("/api/tasks/:id/helpers/:userId", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.removeTaskHelper(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to remove task helper");
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const taskToDelete = await storage.getTask(req.params.id);
      await storage.deleteTask(req.params.id);

      if (taskToDelete?.projectId) {
        await syncProjectStatusFromTasks(taskToDelete.projectId);
      }

      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete task");
    }
  });

  app.get("/api/tasks/:taskId/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const hasAccess = await canAccessTask(req.userId, req.params.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const subTasks = await storage.getSubTasks(req.params.taskId);
      res.json(subTasks);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch sub-tasks");
    }
  });

  app.post("/api/tasks/:taskId/subtasks", isAuthenticated, async (req: any, res) => {
    try {
      const parentTask = await storage.getTask(req.params.taskId);
      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      const currentUser = await storage.getUser(req.userId);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create sub-tasks" });
      }

      const { equipmentId, vehicleId, description } = req.body;
      const name = typeof req.body.name === "string" ? req.body.name.trim() : undefined;

      if (!equipmentId && !vehicleId && !name) {
        return res.status(400).json({ message: "Either equipmentId, vehicleId, or name is required" });
      }

      let assetName = "";
      let selectedEquipment: Awaited<ReturnType<typeof storage.getEquipmentItem>> | undefined;
      if (equipmentId) {
        selectedEquipment = await storage.getEquipmentItem(equipmentId);
        if (!selectedEquipment) return res.status(404).json({ message: "Equipment not found" });
        const locationParts = [];
        if (selectedEquipment.propertyId) {
          const prop = await storage.getProperty(selectedEquipment.propertyId);
          if (prop) locationParts.push(prop.name);
        }
        assetName = selectedEquipment.name + (locationParts.length ? ` (${locationParts.join(", ")})` : "");
      } else if (vehicleId) {
        const vehicle = await storage.getVehicle(vehicleId);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        assetName = `${vehicle.make} ${vehicle.model} ${vehicle.vehicleId}`;
      }

      const subTaskName = name || `${parentTask.name} — ${assetName}`;

      const subExecType = parentTask.executorType || "technician";
      const subHasAssignee = !!parentTask.assignedToId || !!parentTask.assignedVendorId;
      const subPool = subHasAssignee ? null : (subExecType === "student" ? "student_pool" : "technician_pool");

      const subTaskData: any = {
        name: subTaskName,
        description: description || parentTask.description,
        urgency: parentTask.urgency,
        taskType: parentTask.taskType,
        initialDate: parentTask.initialDate,
        estimatedCompletionDate: parentTask.estimatedCompletionDate,
        assignedToId: parentTask.assignedToId,
        areaId: parentTask.areaId,
        propertyId: selectedEquipment?.propertyId || parentTask.propertyId,
        spaceId: selectedEquipment?.spaceId || parentTask.spaceId,
        executorType: subExecType,
        assignedPool: subPool,
        instructions: parentTask.instructions,
        requiresPhoto: parentTask.requiresPhoto,
        createdById: req.userId,
        parentTaskId: parentTask.id,
        status: "not_started" as const,
        equipmentId: equipmentId || null,
        vehicleId: vehicleId || null,
      };

      await validateTaskLocation({
        propertyId: subTaskData.propertyId,
        spaceId: subTaskData.spaceId,
        equipmentId: subTaskData.equipmentId,
        propertyIds: parentTask.propertyIds,
      });

      const subTask = await storage.createTask(subTaskData);
      res.status(201).json(subTask);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to create sub-task");
    }
  });

  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const taskStatusSchema = z.object({
        status: z.enum(["not_started", "needs_estimate", "waiting_approval", "ready", "in_progress", "completed", "on_hold"]),
        onHoldReason: z.string().optional(),
      });
      const { status, onHoldReason } = taskStatusSchema.parse(req.body);
      const taskId = req.params.id;
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const normalizedStatus = status === "ready" ? "not_started" : status;

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot update tasks" });
      }
      
      if (currentUser.role === "student") {
        const isHelper = await storage.isTaskHelper(taskId, userId);
        if (isHelper) {
          return res.status(403).json({ message: "Forbidden: Helpers cannot change task status" });
        }
        const directlyAssigned = task.assignedToId === userId;
        const inPool = task.executorType === "student" && task.assignedPool === "student_pool";
        if (!directlyAssigned && !inPool) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }
      
      if (currentUser.role === "technician") {
        const directlyAssigned = task.assignedToId === userId;
        const isAdditionalAssignee = await storage.isTaskHelper(taskId, userId);
        const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
        if (!directlyAssigned && !isAdditionalAssignee && !inPool) {
          return res.status(403).json({ message: "Forbidden: You can only update tasks assigned to you" });
        }
      }

      if (normalizedStatus === "completed" && task.requiresEstimate) {
        const taskQuotes = await storage.getQuotesByTaskId(taskId);
        if (taskQuotes.length === 0) {
          return res.status(400).json({ message: "Submit an estimate before completing this task" });
        }
        if (task.estimateStatus !== "approved") {
          return res.status(400).json({ message: "Estimates must be approved before completing this task" });
        }
      }

      const updateData: any = { status: normalizedStatus };
      if (normalizedStatus === "completed") {
        updateData.actualCompletionDate = new Date();
      }
      if (normalizedStatus === "on_hold" && onHoldReason) {
        updateData.onHoldReason = onHoldReason;
      }

      const updatedTask = await storage.updateTask(taskId, updateData);

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (updatedTask.projectId) {
        await syncProjectStatusFromTasks(updatedTask.projectId);
      }

      if (updatedTask.requestId) {
        try {
          const linkedRequest = await storage.getServiceRequest(updatedTask.requestId);
          if (linkedRequest) {
            const requester = await storage.getUser(linkedRequest.requesterId);
            if (requester) {
              notifyStatusChange(linkedRequest, requester, task.status, normalizedStatus, notificationService).catch(err =>
                console.error("Failed to send status change notification:", err)
              );
            }
          }
        } catch (notifyErr) {
          console.error("Notification error on status change:", notifyErr);
        }
      }

      if (normalizedStatus === "on_hold" && onHoldReason) {
        await storage.createTaskNote({
          taskId,
          userId: (req as any).userId,
          content: `Task placed on hold: ${onHoldReason}`,
          noteType: "job_note"
        });

      }

      const autoCreateVehicleMaintenanceLog = async (completedTask: any) => {
        if (!completedTask.vehicleId) return;
        try {
          const existingLog = await storage.getVehicleMaintenanceLogByTaskId(completedTask.id);
          if (existingLog) return;

          const vehicle = await storage.getVehicle(completedTask.vehicleId);
          if (!vehicle) return;

          const parts = await storage.getPartsByTask(completedTask.id);
          let totalCost = 0;
          for (const part of parts) {
            totalCost += (Number(part.cost) || 0) * (Number(part.quantity) || 1);
          }

          const taskQuotes = await storage.getQuotesByTaskId(completedTask.id);
          const approvedQuote = taskQuotes.find((q: any) => q.status === "approved");
          if (approvedQuote) {
            totalCost += Number(approvedQuote.estimatedCost) || 0;
          }

          let performedBy = "Maintenance Staff";
          if (completedTask.assignedToId) {
            const tech = await storage.getUser(completedTask.assignedToId);
            if (tech) {
              performedBy = [tech.firstName, tech.lastName].filter(Boolean).join(" ") || tech.username;
            }
          }

          const taskNotes = await storage.getNotesByTask(completedTask.id);
          const notesText = taskNotes.map((n: any) => n.content).filter(Boolean).join("; ");

          let maintenanceType = "repair";
          const nameLower = completedTask.name.toLowerCase();
          if (nameLower.includes("inspect")) maintenanceType = "inspection";
          else if (nameLower.includes("oil change")) maintenanceType = "oil_change";
          else if (nameLower.includes("tire")) maintenanceType = "tire";
          else if (nameLower.includes("brake")) maintenanceType = "brake";
          else if (nameLower.includes("filter")) maintenanceType = "filter";

          const partsNotes = parts.length > 0
            ? "Parts used: " + parts.map((p: any) => `${p.name} x${p.quantity}`).join(", ")
            : "";

          await storage.createVehicleMaintenanceLog({
            vehicleId: completedTask.vehicleId,
            taskId: completedTask.id,
            maintenanceDate: completedTask.actualCompletionDate || new Date(),
            type: maintenanceType,
            description: completedTask.description || completedTask.name,
            cost: totalCost,
            mileageAtMaintenance: vehicle.currentMileage,
            performedBy,
            notes: [notesText, partsNotes].filter(Boolean).join(". ") || null,
          });
        } catch (err) {
          console.error("Error auto-creating vehicle maintenance log:", err);
        }
      }

      if (normalizedStatus === "completed" && updatedTask.parentTaskId) {
        try {
          const siblings = await storage.getSubTasks(updatedTask.parentTaskId);
          const allCompleted = siblings.every(s => s.status === "completed");
          if (allCompleted) {
            const completedParent = await storage.updateTask(updatedTask.parentTaskId, {
              status: "completed",
              actualCompletionDate: new Date(),
            } as any);
            if (completedParent?.projectId) {
              await syncProjectStatusFromTasks(completedParent.projectId);
            }
            if (completedParent) {
              await autoCreateVehicleMaintenanceLog(completedParent);
              await touchPropertyLastWorkFromTask(completedParent);
            }
          }
        } catch (err) {
          console.error("Error in sub-task auto-completion:", err);
        }
      }

      if (normalizedStatus === "in_progress" && updatedTask.parentTaskId) {
        try {
          const parentTask = await storage.getTask(updatedTask.parentTaskId);
          if (parentTask && parentTask.status === "not_started") {
            await storage.updateTask(updatedTask.parentTaskId, {
              status: "in_progress" as any,
            });
          }
        } catch (err) {
          console.error("Error in sub-task auto-start:", err);
        }
      }

      if (normalizedStatus === "completed") {
        await autoCreateVehicleMaintenanceLog(updatedTask);
        await touchPropertyLastWorkFromTask(updatedTask);
        if (updatedTask.parentTaskId) {
          const parent = await storage.getTask(updatedTask.parentTaskId);
          if (parent?.status === "completed") {
            await touchPropertyLastWorkFromTask(parent);
          }
        }
      }

      res.json(updatedTask);
    } catch (error) {
      handleFacilityRouteError(res, error, "Failed to update task status");
    }
  });

  app.post("/api/time-entries", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskId = req.body.taskId;
      
      if (taskId) {
        const hasAccess = await canAccessTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }
      
      const entry = await storage.createTimeEntry({
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        userId,
      });
      res.json(entry);
    } catch (error) {
      handleRouteError(res, error, "Failed to create time entry");
    }
  });

  app.patch("/api/time-entries/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const timeEntry = await storage.getTimeEntry(req.params.id);

      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      if (timeEntry.taskId) {
        const hasAccess = await canAccessTask(userId, timeEntry.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      if (timeEntry.userId !== userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.role !== "admin") {
          return res.status(403).json({ message: "Forbidden: You can only update your own time entries" });
        }
      }

      const timeEntryUpdateSchema = z.object({
        endTime: z.string().refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid endTime format" }).optional(),
        durationMinutes: z.number().int().min(0).optional(),
      });

      const parsed = timeEntryUpdateSchema.parse(req.body);
      const parsedEndTime = parsed.endTime ? new Date(parsed.endTime) : (timeEntry.endTime || new Date());
      const finalDuration = parsed.durationMinutes ?? timeEntry.durationMinutes ?? 0;

      const entry = await storage.updateTimeEntry(
        req.params.id,
        parsedEndTime,
        finalDuration
      );
      res.json(entry);
    } catch (error) {
      handleRouteError(res, error, "Failed to update time entry");
    }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const timeEntry = await storage.getTimeEntry(req.params.id);

      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      if (timeEntry.taskId) {
        const hasAccess = await canAccessTask(userId, timeEntry.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      if (timeEntry.userId !== userId) {
        const currentUser = await storage.getUser(userId);
        if (currentUser?.role !== "admin") {
          return res.status(403).json({ message: "Forbidden: You can only delete your own time entries" });
        }
      }

      await storage.deleteTimeEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete time entry");
    }
  });

  app.get(
    "/api/time-entries/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const entries = await storage.getTimeEntriesByTask(
          req.params.taskId
        );
        res.json(entries);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch time entries");
      }
    }
  );

  app.post("/api/parts", isAuthenticated, requireTaskExecutorOrAdmin, requireTaskAccess(), async (req: any, res) => {
    try {
      const parsed = insertPartUsedSchema.parse(req.body);
      const userId = req.currentUser?.id || req.userId;
      const isHelper = await storage.isTaskHelper(parsed.taskId, userId);
      if (isHelper && req.currentUser?.role === "student") {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot add parts" });
      }
      const role = req.currentUser?.role as string | undefined;
      const lineCost = await resolvePartLineCost(
        parsed.inventoryItemId,
        parsed.quantity ?? "1",
        parsed.cost ?? 0,
        role,
      );
      const part = await storage.createPartUsed({ ...parsed, cost: lineCost });
      res.json(redactPartsUsedForRole([part], role)[0]);
    } catch (error) {
      handleRouteError(res, error, "Failed to create part");
    }
  });

  app.delete("/api/parts/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const [part] = await db.select().from(partsUsed).where(eq(partsUsed.id, req.params.id));
      if (!part) {
        return res.status(404).json({ message: "Part not found" });
      }
      const userId = req.currentUser?.id || req.userId;
      const hasAccess = await canAccessTask(userId, part.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const isHelper = await storage.isTaskHelper(part.taskId, userId);
      if (isHelper && req.currentUser?.role === "student") {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot delete parts" });
      }
      await storage.deletePartUsed(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete part");
    }
  });

  app.get(
    "/api/parts/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req: any, res) => {
      try {
        const parts = await storage.getPartsByTask(req.params.taskId);
        const role = req.currentUser?.role as string | undefined;
        res.json(redactPartsUsedForRole(parts, role));
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch parts");
      }
    }
  );

  app.post("/api/task-notes", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const taskId = req.body.taskId;
      
      if (taskId) {
        const hasAccess = await canAccessTask(userId, taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }
      
      const noteData = insertTaskNoteSchema.parse({
        ...req.body,
        userId,
      });
      const note = await storage.createTaskNote(noteData);
      res.json(note);
    } catch (error) {
      handleRouteError(res, error, "Failed to create task note");
    }
  });

  app.get(
    "/api/task-notes/task/:taskId",
    isAuthenticated,
    requireTaskExecutorOrAdmin,
    requireTaskAccess(),
    async (req, res) => {
      try {
        const notes = await storage.getNotesByTask(req.params.taskId);
        res.json(notes);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch task notes");
      }
    }
  );

  app.patch("/api/task-notes/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const noteId = req.params.id;
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }

      const note = await storage.getTaskNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Task note not found" });
      }

      const currentUser = await storage.getUser(userId);
      if (note.userId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own notes" });
      }

      if (note.taskId) {
        const hasAccess = await canAccessTask(userId, note.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      const updated = await storage.updateTaskNote(noteId, content);
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update task note");
    }
  });

  app.delete("/api/task-notes/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);
      const noteId = req.params.id;

      const note = await storage.getTaskNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Task note not found" });
      }

      if (note.taskId) {
        const hasAccess = await canAccessTask(userId, note.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
        }
      }

      if (note.userId !== userId && currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only delete your own notes" });
      }

      await storage.deleteTaskNote(noteId);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete task note");
    }
  });

  app.get("/api/tasks/:taskId/checklist-groups", isAuthenticated, async (req: any, res) => {
    try {
      const hasAccess = await canAccessTask(req.userId, req.params.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const groups = await storage.getChecklistGroupsByTask(req.params.taskId);
      res.json(groups);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch checklist groups");
    }
  });

  app.post("/api/tasks/:taskId/checklist-groups", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const groupData = {
        taskId: req.params.taskId,
        name: req.body.name,
        sortOrder: req.body.sortOrder || 0,
      };
      const group = await storage.createChecklistGroup(groupData);
      res.json(group);
    } catch (error) {
      handleRouteError(res, error, "Failed to create checklist group");
    }
  });

  app.patch("/api/checklist-groups/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      const existingGroup = await storage.getChecklistGroup(req.params.id);
      if (!existingGroup) {
        return res.status(404).json({ message: "Checklist group not found" });
      }
      
      if (!existingGroup.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist group has no associated task" });
      }
      
      const hasAccess = await canAccessTask(userId, existingGroup.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const isHelper = await storage.isTaskHelper(existingGroup.taskId, userId);
      if (isHelper && req.currentUser?.role === "student") {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot modify checklists" });
      }
      
      const groupUpdateSchema = z.object({
        name: z.string().optional(),
        sortOrder: z.number().optional(),
      });
      const validated = groupUpdateSchema.parse(req.body);
      const group = await storage.updateChecklistGroup(req.params.id, validated);
      res.json(group);
    } catch (error) {
      handleRouteError(res, error, "Failed to update checklist group");
    }
  });

  app.delete("/api/checklist-groups/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteChecklistGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete checklist group");
    }
  });

  app.post("/api/checklist-groups/:groupId/items", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const itemData = {
        groupId: req.params.groupId,
        text: req.body.text,
        isCompleted: req.body.isCompleted || false,
        sortOrder: req.body.sortOrder || 0,
      };
      const item = await storage.createChecklistItem(itemData);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to create checklist item");
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      const existingItem = await storage.getChecklistItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      
      if (!existingItem.groupId) {
        return res.status(403).json({ message: "Forbidden: Checklist item has no associated group" });
      }
      
      const group = await storage.getChecklistGroup(existingItem.groupId);
      if (!group) {
        return res.status(404).json({ message: "Checklist group not found" });
      }
      
      if (!group.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist group has no associated task" });
      }
      
      const hasAccess = await canAccessTask(userId, group.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const isHelper = await storage.isTaskHelper(group.taskId, userId);
      if (isHelper && req.currentUser?.role === "student") {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot modify checklists" });
      }
      
      const itemUpdateSchema = z.object({
        text: z.string().optional(),
        isCompleted: z.boolean().optional(),
        sortOrder: z.number().optional(),
        completedById: z.string().nullable().optional(),
      });
      const validated = itemUpdateSchema.parse(req.body);
      const item = await storage.updateChecklistItem(req.params.id, validated);
      res.json(item);
    } catch (error) {
      handleRouteError(res, error, "Failed to update checklist item");
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteChecklistItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete checklist item");
    }
  });
}
