import {
  tasks,
  serviceRequests,
  users,
  areas,
  timeEntries,
  taskNotes,
  taskChecklistGroups,
  taskChecklistItems,
  checklistTemplates,
  taskDependencies,
  slaConfigs,
  taskHelpers,
  type Task,
  type InsertTask,
  type TimeEntry,
  type InsertTimeEntry,
  type TaskNote,
  type InsertTaskNote,
  type TaskChecklistGroup,
  type InsertTaskChecklistGroup,
  type TaskChecklistItem,
  type InsertTaskChecklistItem,
  type ChecklistTemplate,
  type InsertChecklistTemplate,
  type TaskDependency,
  type InsertTaskDependency,
  type SlaConfig,
  type TaskHelper,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, or, desc, isNull, sql } from "drizzle-orm";

function normalizeTaskPool(data: any): any {
  const normalized = { ...data };
  if (!normalized.executorType) {
    normalized.executorType = "technician";
  }
  const hasDirectAssignee = !!normalized.assignedToId || !!normalized.assignedVendorId;
  if (hasDirectAssignee) {
    normalized.assignedPool = null;
  } else if (!normalized.assignedPool) {
    normalized.assignedPool = normalized.executorType === "student" ? "student_pool" : "technician_pool";
  }
  return normalized;
}

export async function getTasks(filters?: {
  assignedToId?: string;
  assignedVendorId?: string;
  status?: string;
  areaId?: string;
  executorType?: string;
  assignedToIdOrPool?: { userId: string; pool: string };
  equipmentId?: string;
}): Promise<Task[]> {
  let query = db.select({
      id: tasks.id,
      requestId: tasks.requestId,
      propertyId: tasks.propertyId,
      spaceId: tasks.spaceId,
      equipmentId: tasks.equipmentId,
      vehicleId: tasks.vehicleId,
      name: tasks.name,
      description: tasks.description,
      urgency: tasks.urgency,
      areaId: tasks.areaId,
      subdivisionId: tasks.subdivisionId,
      initialDate: tasks.initialDate,
      estimatedCompletionDate: tasks.estimatedCompletionDate,
      actualCompletionDate: tasks.actualCompletionDate,
      assignedToId: tasks.assignedToId,
      assignedVendorId: tasks.assignedVendorId,
      taskType: tasks.taskType,
      executorType: tasks.executorType,
      assignedPool: tasks.assignedPool,
      status: tasks.status,
      onHoldReason: tasks.onHoldReason,
      recurringFrequency: tasks.recurringFrequency,
      recurringInterval: tasks.recurringInterval,
      recurringEndDate: tasks.recurringEndDate,
      contactType: tasks.contactType,
      contactStaffId: tasks.contactStaffId,
      contactName: tasks.contactName,
      contactEmail: tasks.contactEmail,
      contactPhone: tasks.contactPhone,
      instructions: tasks.instructions,
      requiresPhoto: tasks.requiresPhoto,
      requiresEstimate: tasks.requiresEstimate,
      estimateStatus: tasks.estimateStatus,
      approvedQuoteId: tasks.approvedQuoteId,
      createdById: tasks.createdById,
      projectId: tasks.projectId,
      estimatedHours: tasks.estimatedHours,
      scheduledStartTime: tasks.scheduledStartTime,
      requiredSkill: tasks.requiredSkill,
      aiGenerated: tasks.aiGenerated,
      parentTaskId: tasks.parentTaskId,
      isCampusWide: tasks.isCampusWide,
      propertyIds: tasks.propertyIds,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(serviceRequests, eq(tasks.requestId, serviceRequests.id))
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .leftJoin(areas, eq(tasks.areaId, areas.id));

  const conditions = [];
  if (filters?.assignedToId) {
    conditions.push(eq(tasks.assignedToId, filters.assignedToId));
  }
  if (filters?.assignedVendorId) {
    conditions.push(eq(tasks.assignedVendorId, filters.assignedVendorId));
  }
  if (filters?.status) {
    conditions.push(eq(tasks.status, filters.status as any));
  }
  if (filters?.areaId) {
    conditions.push(eq(tasks.areaId, filters.areaId));
  }
  if (filters?.executorType) {
    conditions.push(eq(tasks.executorType, filters.executorType as any));
  }
  if (filters?.equipmentId) {
    conditions.push(eq(tasks.equipmentId, filters.equipmentId));
  }
  if (filters?.assignedToIdOrPool) {
    const { userId, pool } = filters.assignedToIdOrPool;
    conditions.push(
      or(
        eq(tasks.assignedToId, userId),
        eq(tasks.assignedPool, pool)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(tasks.initialDate));
}

export async function getTask(id: string): Promise<Task | undefined> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id));
  return task;
}

export async function createTask(taskData: InsertTask): Promise<Task> {
  const normalized = normalizeTaskPool(taskData);
  const [task] = await db
    .insert(tasks)
    .values(normalized)
    .returning();
  return task;
}

export async function updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
  const [task] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function getAvailablePoolTasks(pool: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedPool, pool),
        isNull(tasks.assignedToId),
        isNull(tasks.assignedVendorId),
        or(
          eq(tasks.status, "not_started"),
          eq(tasks.status, "ready")
        )
      )
    )
    .orderBy(desc(tasks.createdAt));
}

export async function getAvailablePoolTaskCount(pool: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedPool, pool),
        isNull(tasks.assignedToId),
        isNull(tasks.assignedVendorId),
        or(
          eq(tasks.status, "not_started"),
          eq(tasks.status, "ready")
        )
      )
    );
  return result[0]?.count ?? 0;
}

export async function backfillTaskPools(): Promise<number> {
  const unassignedTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.assignedToId),
        isNull(tasks.assignedVendorId),
        or(
          isNull(tasks.assignedPool),
          isNull(tasks.executorType)
        ),
        or(
          eq(tasks.status, "not_started"),
          eq(tasks.status, "ready")
        )
      )
    );
  
  let count = 0;
  for (const task of unassignedTasks) {
    const execType = task.executorType || "technician";
    const pool = execType === "student" ? "student_pool" : "technician_pool";
    await db
      .update(tasks)
      .set({ executorType: execType, assignedPool: pool })
      .where(eq(tasks.id, task.id));
    count++;
  }
  return count;
}

export async function claimTask(taskId: string, userId: string, pool: string): Promise<Task | null> {
  const [task] = await db
    .update(tasks)
    .set({
      assignedToId: userId,
      assignedPool: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.assignedPool, pool),
        isNull(tasks.assignedToId),
        isNull(tasks.assignedVendorId),
        or(
          eq(tasks.status, "not_started"),
          eq(tasks.status, "ready")
        )
      )
    )
    .returning();
  return task || null;
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function updateTaskStatus(
  id: string,
  status: string,
  onHoldReason?: string,
  actualCompletionDate?: Date
): Promise<Task | undefined> {
  const updateData: any = { 
    status: status as any, 
    updatedAt: new Date() 
  };

  if (onHoldReason !== undefined) {
    updateData.onHoldReason = onHoldReason;
  }

  if (actualCompletionDate !== undefined) {
    updateData.actualCompletionDate = actualCompletionDate;
  }

  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function getSubTasks(parentTaskId: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentTaskId));
}

export async function createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
  const [entry] = await db.insert(timeEntries).values(entryData).returning();
  return entry;
}

export async function getTimeEntry(id: string): Promise<TimeEntry | undefined> {
  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id));
  return entry;
}

export async function updateTimeEntry(
  id: string,
  endTime: Date,
  durationMinutes: number
): Promise<TimeEntry | undefined> {
  const [entry] = await db
    .update(timeEntries)
    .set({ endTime, durationMinutes })
    .where(eq(timeEntries.id, id))
    .returning();
  return entry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
}

export async function getTimeEntriesByTask(taskId: string): Promise<TimeEntry[]> {
  return await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId));
}

export async function createTaskNote(noteData: InsertTaskNote): Promise<TaskNote> {
  const [note] = await db.insert(taskNotes).values(noteData).returning();
  return note;
}

export async function getTaskNote(id: string): Promise<TaskNote | undefined> {
  const [note] = await db.select().from(taskNotes).where(eq(taskNotes.id, id));
  return note;
}

export async function getNotesByTask(taskId: string): Promise<TaskNote[]> {
  return await db
    .select()
    .from(taskNotes)
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(taskNotes.createdAt);
}

export async function updateTaskNote(id: string, content: string): Promise<TaskNote> {
  const [note] = await db
    .update(taskNotes)
    .set({ content })
    .where(eq(taskNotes.id, id))
    .returning();
  return note;
}

export async function deleteTaskNote(id: string): Promise<void> {
  await db.delete(taskNotes).where(eq(taskNotes.id, id));
}

export async function getChecklistGroupsByTask(taskId: string): Promise<(TaskChecklistGroup & { items: TaskChecklistItem[] })[]> {
  const groups = await db
    .select()
    .from(taskChecklistGroups)
    .where(eq(taskChecklistGroups.taskId, taskId))
    .orderBy(taskChecklistGroups.sortOrder);
  
  const result = await Promise.all(
    groups.map(async (group) => {
      const items = await db
        .select()
        .from(taskChecklistItems)
        .where(eq(taskChecklistItems.groupId, group.id))
        .orderBy(taskChecklistItems.sortOrder);
      return { ...group, items };
    })
  );
  
  return result;
}

export async function getChecklistGroup(id: string): Promise<TaskChecklistGroup | undefined> {
  const [group] = await db.select().from(taskChecklistGroups).where(eq(taskChecklistGroups.id, id));
  return group;
}

export async function createChecklistGroup(group: InsertTaskChecklistGroup): Promise<TaskChecklistGroup> {
  const [result] = await db.insert(taskChecklistGroups).values(group).returning();
  return result;
}

export async function updateChecklistGroup(id: string, data: Partial<InsertTaskChecklistGroup>): Promise<TaskChecklistGroup | undefined> {
  const [result] = await db
    .update(taskChecklistGroups)
    .set(data)
    .where(eq(taskChecklistGroups.id, id))
    .returning();
  return result;
}

export async function deleteChecklistGroup(id: string): Promise<void> {
  await db.delete(taskChecklistGroups).where(eq(taskChecklistGroups.id, id));
}

export async function getChecklistItem(id: string): Promise<TaskChecklistItem | undefined> {
  const [item] = await db.select().from(taskChecklistItems).where(eq(taskChecklistItems.id, id));
  return item;
}

export async function createChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem> {
  const [result] = await db.insert(taskChecklistItems).values(item).returning();
  return result;
}

export async function updateChecklistItem(id: string, data: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem | undefined> {
  const [result] = await db
    .update(taskChecklistItems)
    .set(data)
    .where(eq(taskChecklistItems.id, id))
    .returning();
  return result;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await db.delete(taskChecklistItems).where(eq(taskChecklistItems.id, id));
}

export async function createTaskWithChecklistGroups(
  taskData: InsertTask,
  groups: { name: string; sortOrder?: number; items: { text: string; isCompleted?: boolean; sortOrder?: number }[] }[]
): Promise<{ task: Task; groups: (TaskChecklistGroup & { items: TaskChecklistItem[] })[] }> {
  const normalizedTaskData = normalizeTaskPool(taskData);
  return await db.transaction(async (tx) => {
    const [task] = await tx.insert(tasks).values(normalizedTaskData).returning();

    const createdGroups: (TaskChecklistGroup & { items: TaskChecklistItem[] })[] = [];
    
    for (let i = 0; i < groups.length; i++) {
      const groupData = groups[i];
      const [group] = await tx
        .insert(taskChecklistGroups)
        .values({
          taskId: task.id,
          name: groupData.name,
          sortOrder: groupData.sortOrder ?? i,
        })
        .returning();

      const createdItems: TaskChecklistItem[] = [];
      if (groupData.items.length > 0) {
        const itemsData = groupData.items.map((item, idx) => ({
          groupId: group.id,
          text: item.text,
          isCompleted: item.isCompleted || false,
          sortOrder: item.sortOrder ?? idx,
        }));
        const items = await tx.insert(taskChecklistItems).values(itemsData).returning();
        createdItems.push(...items);
      }

      createdGroups.push({ ...group, items: createdItems });
    }

    return { task, groups: createdGroups };
  });
}

export async function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  return await db
    .select()
    .from(checklistTemplates)
    .orderBy(desc(checklistTemplates.createdAt));
}

export async function getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, id));
  return template;
}

export async function createChecklistTemplate(templateData: InsertChecklistTemplate): Promise<ChecklistTemplate> {
  const [template] = await db
    .insert(checklistTemplates)
    .values(templateData)
    .returning();
  return template;
}

export async function updateChecklistTemplate(
  id: string,
  data: Partial<InsertChecklistTemplate>
): Promise<ChecklistTemplate | undefined> {
  const [template] = await db
    .update(checklistTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(checklistTemplates.id, id))
    .returning();
  return template;
}

export async function deleteChecklistTemplate(id: string): Promise<void> {
  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
}

export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
  return await db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
}

export async function createTaskDependency(dep: InsertTaskDependency): Promise<TaskDependency> {
  const [created] = await db.insert(taskDependencies).values(dep).returning();
  return created;
}

export async function deleteTaskDependency(id: string): Promise<void> {
  await db.delete(taskDependencies).where(eq(taskDependencies.id, id));
}

export async function getSlaConfigs(): Promise<SlaConfig[]> {
  return await db.select().from(slaConfigs).orderBy(slaConfigs.urgencyLevel);
}

export async function upsertSlaConfig(urgencyLevel: string, data: { responseHours: number; resolutionHours: number }): Promise<SlaConfig> {
  const existing = await db.select().from(slaConfigs).where(eq(slaConfigs.urgencyLevel, urgencyLevel));
  if (existing.length > 0) {
    const [updated] = await db.update(slaConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(slaConfigs.urgencyLevel, urgencyLevel))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(slaConfigs).values({ urgencyLevel, ...data }).returning();
    return created;
  }
}

export async function addTaskHelper(taskId: string, userId: string): Promise<TaskHelper> {
  const existing = await db.select().from(taskHelpers)
    .where(and(eq(taskHelpers.taskId, taskId), eq(taskHelpers.userId, userId)));
  if (existing.length > 0) return existing[0];
  const [helper] = await db.insert(taskHelpers)
    .values({ taskId, userId })
    .returning();
  return helper;
}

export async function removeTaskHelper(taskId: string, userId: string): Promise<void> {
  await db.delete(taskHelpers)
    .where(and(eq(taskHelpers.taskId, taskId), eq(taskHelpers.userId, userId)));
}

export async function getTaskHelpers(taskId: string): Promise<TaskHelper[]> {
  return await db.select().from(taskHelpers)
    .where(eq(taskHelpers.taskId, taskId));
}

export async function getHelperTaskIds(userId: string): Promise<string[]> {
  const rows = await db.select({ taskId: taskHelpers.taskId })
    .from(taskHelpers)
    .where(eq(taskHelpers.userId, userId));
  return rows.map(r => r.taskId);
}

export async function isTaskHelper(taskId: string, userId: string): Promise<boolean> {
  const rows = await db.select({ id: taskHelpers.id })
    .from(taskHelpers)
    .where(and(eq(taskHelpers.taskId, taskId), eq(taskHelpers.userId, userId)));
  return rows.length > 0;
}
