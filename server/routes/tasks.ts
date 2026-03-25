import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTechnicianOrAdmin, requireTaskExecutorOrAdmin, requireTaskAccess, canAccessTask, getCurrentUser } from "../middleware";
import { handleRouteError, syncProjectStatusFromTasks, getAuthUser } from "../routeUtils";
import { notificationService, notifyTaskCreated, notifyStatusChange, notifyTaskAssigned } from "../notifications";
import { insertTaskSchema, insertPartUsedSchema, insertTaskNoteSchema, insertTaskChecklistSchema, partsUsed } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { eq } from "drizzle-orm";

export function registerTaskRoutes(app: Express) {
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot access tasks" });
      }

      let filters: any = {};

      const equipmentIdFilter = req.query.equipmentId as string | undefined;

      if (!equipmentIdFilter) {
        if (currentUser.role === "student") {
          filters.assignedToId = userId;
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

      let allTasks = await storage.getTasks(filters);

      if (currentUser.role === "student" && !equipmentIdFilter) {
        const helperTaskIds = await storage.getHelperTaskIds(userId);
        if (helperTaskIds.length > 0) {
          const helperFilters: Record<string, string> = {};
          if (req.query.status) helperFilters.status = req.query.status as string;
          if (req.query.areaId) helperFilters.areaId = req.query.areaId as string;
          const helperTasks = await storage.getTasks(helperFilters);
          const helperFiltered = helperTasks
            .filter(t => helperTaskIds.includes(t.id) && !allTasks.some(at => at.id === t.id));
          const tagged = helperFiltered.map(t => ({ ...t, isHelper: true as const }));
          allTasks = [...allTasks, ...tagged];
        }
      }

      if (currentUser.role === "admin" || currentUser.role === "technician") {
        const tasksWithHelperCount = await Promise.all(
          allTasks.map(async (t) => {
            const helpers = await storage.getTaskHelpers(t.id);
            return { ...t, helperCount: helpers.length };
          })
        );
        return res.json(tasksWithHelperCount);
      }

      res.json(allTasks);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch tasks");
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

      if (currentUser.role === "staff") {
        return res.status(403).json({ message: "Forbidden: Staff cannot access tasks" });
      }
      
      if (currentUser.role === "student") {
        const isHelper = await storage.isTaskHelper(task.id, userId);
        if (task.assignedToId !== userId && !isHelper) {
          return res.status(403).json({ message: "Forbidden: You can only view tasks assigned to you" });
        }
      }
      
      if (currentUser.role === "technician") {
        if (task.assignedToId !== userId) {
          return res.status(403).json({ message: "Forbidden: You can only view tasks assigned to you" });
        }
      }

      const helpers = await storage.getTaskHelpers(task.id);
      const helperUsers = await Promise.all(
        helpers.map(async (h) => {
          const user = await storage.getUser(h.userId);
          return user ? { id: h.id, userId: h.userId, taskId: h.taskId, assignedAt: h.assignedAt, user: { id: user.id, name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username, email: user.email, role: user.role } } : null;
        })
      );
      const isHelper = currentUser.role === "student" ? await storage.isTaskHelper(task.id, userId) : false;
      res.json({ ...task, helpers: helperUsers.filter(Boolean), isHelper });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch task");
    }
  });

  app.post("/api/tasks", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { checklists, checklistGroups, helperUserIds, ...taskPayload } = req.body;
      
      const taskData = insertTaskSchema.parse({
        ...taskPayload,
        createdById: userId,
        initialDate: taskPayload.initialDate ? new Date(taskPayload.initialDate) : new Date(),
        estimatedCompletionDate: taskPayload.estimatedCompletionDate ? new Date(taskPayload.estimatedCompletionDate) : undefined,
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

      const flatChecklistSchema = z.array(z.object({
        text: z.string().min(1, "Checklist item text is required"),
        isCompleted: z.boolean().optional().default(false),
        sortOrder: z.number().optional(),
      })).optional();
      
      const validatedGroups = checklistGroupSchema.parse(checklistGroups);
      const validatedFlatChecklists = flatChecklistSchema.parse(checklists);

      let task;
      
      if (validatedGroups && validatedGroups.length > 0) {
        const result = await storage.createTaskWithChecklistGroups(taskData, validatedGroups);
        task = result.task;
      } else if (validatedFlatChecklists && validatedFlatChecklists.length > 0) {
        const result = await storage.createTaskWithChecklists(taskData, validatedFlatChecklists);
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
        if (task.assignedToId) {
          const assignedUser = await storage.getUser(task.assignedToId);
          if (assignedUser) {
            const fakeRequest = {
              title: task.name,
              description: task.description,
              urgency: task.urgency,
            } as any;
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
      handleRouteError(res, error, "Failed to create task");
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
          const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
          if (!directlyAssigned && !inPool) {
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

      if (currentUser?.role === "admin" && patchHelperIds !== undefined && Array.isArray(patchHelperIds)) {
        const existingHelpers = await storage.getTaskHelpers(req.params.id);
        const existingUserIds = existingHelpers.map(h => h.userId);
        const toAdd = patchHelperIds.filter((id: string) => !existingUserIds.includes(id));
        const toRemove = existingUserIds.filter(id => !patchHelperIds.includes(id));
        for (const id of toAdd) await storage.addTaskHelper(req.params.id, id);
        for (const id of toRemove) await storage.removeTaskHelper(req.params.id, id);
      }

      const updateData: any = { ...restBody };

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

      const task = await storage.updateTask(req.params.id, updateData);

      if (task?.projectId) {
        await syncProjectStatusFromTasks(task.projectId);
      }

      res.json(task);
    } catch (error) {
      handleRouteError(res, error, "Failed to update task");
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
      if (equipmentId) {
        const equip = await storage.getEquipmentItem(equipmentId);
        if (!equip) return res.status(404).json({ message: "Equipment not found" });
        const locationParts = [];
        if (equip.propertyId) {
          const prop = await storage.getProperty(equip.propertyId);
          if (prop) locationParts.push(prop.name);
        }
        assetName = equip.name + (locationParts.length ? ` (${locationParts.join(", ")})` : "");
      } else if (vehicleId) {
        const vehicle = await storage.getVehicle(vehicleId);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        assetName = `${vehicle.make} ${vehicle.model} ${vehicle.vehicleId}`;
      }

      const subTaskName = name || `${parentTask.name} — ${assetName}`;

      const subTaskData: any = {
        name: subTaskName,
        description: description || parentTask.description,
        urgency: parentTask.urgency,
        taskType: parentTask.taskType,
        initialDate: parentTask.initialDate,
        estimatedCompletionDate: parentTask.estimatedCompletionDate,
        assignedToId: parentTask.assignedToId,
        areaId: parentTask.areaId,
        propertyId: equipmentId ? (await storage.getEquipmentItem(equipmentId))?.propertyId || parentTask.propertyId : parentTask.propertyId,
        spaceId: equipmentId ? (await storage.getEquipmentItem(equipmentId))?.spaceId || parentTask.spaceId : parentTask.spaceId,
        executorType: parentTask.executorType,
        instructions: parentTask.instructions,
        requiresPhoto: parentTask.requiresPhoto,
        createdById: req.userId,
        parentTaskId: parentTask.id,
        status: "not_started" as const,
        equipmentId: equipmentId || null,
        vehicleId: vehicleId || null,
      };

      const subTask = await storage.createTask(subTaskData);
      res.status(201).json(subTask);
    } catch (error) {
      handleRouteError(res, error, "Failed to create sub-task");
    }
  });

  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const taskStatusSchema = z.object({
        status: z.string().min(1),
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
        const inPool = task.executorType === "technician" && task.assignedPool === "technician_pool";
        if (!directlyAssigned && !inPool) {
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

        if (updatedTask.requestId) {
          await storage.createMessage({
            requestId: updatedTask.requestId,
            senderId: (req as any).userId,
            content: `Task "${updatedTask.name}" has been placed on hold. Reason: ${onHoldReason}`
          });
        }
      } else if (normalizedStatus === "completed" && updatedTask.requestId) {
        await storage.createMessage({
          requestId: updatedTask.requestId,
          senderId: (req as any).userId,
          content: `Task "${updatedTask.name}" has been completed.`
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
      }

      res.json(updatedTask);
    } catch (error) {
      handleRouteError(res, error, "Failed to update task status");
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
        endTime: z.string().refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid endTime format" }),
        durationMinutes: z.number().int().min(0).optional(),
      });

      const parsed = timeEntryUpdateSchema.parse(req.body);
      const parsedEndTime = new Date(parsed.endTime);

      const entry = await storage.updateTimeEntry(
        req.params.id,
        parsedEndTime,
        parsed.durationMinutes!
      );
      res.json(entry);
    } catch (error) {
      handleRouteError(res, error, "Failed to update time entry");
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
      const partData = insertPartUsedSchema.parse(req.body);
      const userId = req.currentUser?.id || req.userId;
      const isHelper = await storage.isTaskHelper(partData.taskId, userId);
      if (isHelper) {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot add parts" });
      }
      const part = await storage.createPartUsed(partData);
      res.json(part);
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
      if (isHelper) {
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
    async (req, res) => {
      try {
        const parts = await storage.getPartsByTask(req.params.taskId);
        res.json(parts);
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

  app.get("/api/tasks/:taskId/checklists", isAuthenticated, async (req: any, res) => {
    try {
      const checklists = await storage.getChecklistsByTask(req.params.taskId);
      res.json(checklists);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch task checklists");
    }
  });

  app.post("/api/tasks/:taskId/checklists", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const checklistData = {
        taskId: req.params.taskId,
        text: req.body.text,
        isCompleted: req.body.isCompleted || false,
        sortOrder: req.body.sortOrder || 0,
      };
      const checklist = await storage.createTaskChecklist(checklistData);
      res.json(checklist);
    } catch (error) {
      handleRouteError(res, error, "Failed to create task checklist");
    }
  });

  app.patch("/api/task-checklists/:id", isAuthenticated, requireTaskExecutorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.userId;
      
      const existingChecklist = await storage.getTaskChecklist(req.params.id);
      if (!existingChecklist) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      
      if (!existingChecklist.taskId) {
        return res.status(403).json({ message: "Forbidden: Checklist has no associated task" });
      }
      
      const hasAccess = await canAccessTask(userId, existingChecklist.taskId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Forbidden: You don't have access to this task" });
      }
      const isHelper = await storage.isTaskHelper(existingChecklist.taskId, userId);
      if (isHelper) {
        return res.status(403).json({ message: "Forbidden: Student helpers cannot modify checklists" });
      }
      
      const validated = insertTaskChecklistSchema.partial().parse(req.body);
      const checklist = await storage.updateTaskChecklist(req.params.id, validated);
      res.json(checklist);
    } catch (error) {
      handleRouteError(res, error, "Failed to update task checklist");
    }
  });

  app.delete("/api/task-checklists/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteTaskChecklist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete task checklist");
    }
  });

  app.get("/api/tasks/:taskId/checklist-groups", isAuthenticated, async (req: any, res) => {
    try {
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
      if (isHelper) {
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
      if (isHelper) {
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
