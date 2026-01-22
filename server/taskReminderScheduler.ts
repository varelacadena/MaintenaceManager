import { db } from "./db";
import { tasks, users } from "@shared/schema";
import { eq, and, lte, gte, or, isNull, ne } from "drizzle-orm";
import { log } from "./vite";
import { storage } from "./storage";

interface TaskWithReminder {
  id: string;
  name: string;
  description: string;
  initialDate: Date;
  estimatedCompletionDate: Date | null;
  taskType: string;
  status: string;
  assignedToId: string | null;
  createdById: string;
  daysUntilDue: number;
}

async function getUpcomingReminderTasks(daysAhead: number = 7): Promise<TaskWithReminder[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const now = new Date();

  const results = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      description: tasks.description,
      initialDate: tasks.initialDate,
      estimatedCompletionDate: tasks.estimatedCompletionDate,
      taskType: tasks.taskType,
      status: tasks.status,
      assignedToId: tasks.assignedToId,
      createdById: tasks.createdById,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.taskType, "reminder"),
        ne(tasks.status, "completed"),
        lte(tasks.initialDate, futureDate),
        gte(tasks.initialDate, now)
      )
    )
    .orderBy(tasks.initialDate);

  return results.map(task => ({
    ...task,
    daysUntilDue: Math.ceil((new Date(task.initialDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }));
}

async function getOverdueTasks(): Promise<TaskWithReminder[]> {
  const now = new Date();

  const results = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      description: tasks.description,
      initialDate: tasks.initialDate,
      estimatedCompletionDate: tasks.estimatedCompletionDate,
      taskType: tasks.taskType,
      status: tasks.status,
      assignedToId: tasks.assignedToId,
      createdById: tasks.createdById,
    })
    .from(tasks)
    .where(
      and(
        or(eq(tasks.taskType, "reminder"), eq(tasks.taskType, "one_time")),
        ne(tasks.status, "completed"),
        lte(tasks.estimatedCompletionDate, now)
      )
    )
    .orderBy(tasks.estimatedCompletionDate);

  return results.map(task => ({
    ...task,
    daysUntilDue: Math.floor((new Date(task.estimatedCompletionDate || task.initialDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }));
}

async function hasExistingNotification(relatedId: string, type: string): Promise<boolean> {
  return await storage.hasNotificationForRelatedItem(relatedId, type);
}

async function processTaskReminders(): Promise<void> {
  try {
    const upcomingReminders = await getUpcomingReminderTasks(7);
    
    for (const task of upcomingReminders) {
      const hasNotification = await hasExistingNotification(task.id, "task_reminder");
      if (hasNotification) continue;
      
      const userIds: string[] = [];
      if (task.assignedToId) {
        userIds.push(task.assignedToId);
      }
      userIds.push(task.createdById);
      
      const uniqueUserIds = [...new Set(userIds)];
      
      for (const userId of uniqueUserIds) {
        await storage.createNotification({
          userId,
          type: "task_reminder",
          title: "Reminder Due Soon",
          message: `"${task.name}" is due in ${task.daysUntilDue} day${task.daysUntilDue === 1 ? '' : 's'}`,
          link: `/tasks/${task.id}`,
          relatedId: task.id,
          relatedType: "task",
        });
      }
      
      log(`Created reminder notification for task: ${task.name}`);
    }

    const overdueTasks = await getOverdueTasks();
    
    for (const task of overdueTasks) {
      const hasNotification = await hasExistingNotification(task.id, "task_overdue");
      if (hasNotification) continue;
      
      const userIds: string[] = [];
      if (task.assignedToId) {
        userIds.push(task.assignedToId);
      }
      userIds.push(task.createdById);
      
      const uniqueUserIds = [...new Set(userIds)];
      
      for (const userId of uniqueUserIds) {
        await storage.createNotification({
          userId,
          type: "task_overdue",
          title: "Task Overdue",
          message: `"${task.name}" is ${Math.abs(task.daysUntilDue)} day${Math.abs(task.daysUntilDue) === 1 ? '' : 's'} overdue`,
          link: `/tasks/${task.id}`,
          relatedId: task.id,
          relatedType: "task",
        });
      }
      
      log(`Created overdue notification for task: ${task.name}`);
    }
  } catch (error) {
    log(`Error processing task reminders: ${error}`, "error");
  }
}

export function startTaskReminderScheduler(): void {
  processTaskReminders();
  
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  setInterval(() => {
    log("Running task reminder scheduler...");
    processTaskReminders();
  }, intervalMs);
  
  log("Task reminder scheduler started (runs every hour)");
}

export { processTaskReminders };
