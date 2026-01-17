import { db } from "./db";
import { tasks } from "@shared/schema";
import { eq, and, isNotNull, ne, or } from "drizzle-orm";
import { log } from "./vite";

// Calculate the next occurrence date based on frequency and interval
function calculateNextDate(
  currentDate: Date,
  frequency: string,
  interval: number
): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + interval * 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + interval);
  }
  
  return nextDate;
}

// Process recurring tasks and create new instances when needed
async function processRecurringTasks(): Promise<void> {
  try {
    // Find all recurring tasks that are completed
    const completedRecurringTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, "recurring"),
          eq(tasks.status, "completed"),
          isNotNull(tasks.recurringFrequency)
        )
      );

    const now = new Date();

    for (const task of completedRecurringTasks) {
      // Check if recurring end date has passed
      if (task.recurringEndDate) {
        const endDate = new Date(task.recurringEndDate);
        if (now > endDate) {
          continue; // Skip - recurring period has ended
        }
      }

      const frequency = task.recurringFrequency;
      const interval = task.recurringInterval || 1;
      
      if (!frequency) continue;

      // Calculate the next occurrence date based on the completed task's due date or completion date
      const baseDate = task.actualCompletionDate 
        ? new Date(task.actualCompletionDate) 
        : task.estimatedCompletionDate 
          ? new Date(task.estimatedCompletionDate)
          : new Date(task.initialDate);
      
      const nextDueDate = calculateNextDate(baseDate, frequency, interval);

      // Check if recurring end date has passed for the next occurrence
      if (task.recurringEndDate) {
        const endDate = new Date(task.recurringEndDate);
        if (nextDueDate > endDate) {
          continue; // Skip - next occurrence would be after end date
        }
      }

      // Check if a task with the same name, property, and area already exists
      // in ANY non-completed status (not_started, in_progress, on_hold)
      // to avoid creating duplicates regardless of task progress
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.name, task.name),
            eq(tasks.taskType, "recurring"),
            ne(tasks.status, "completed"),
            // Match on property and area to avoid false positives on same-named tasks
            task.propertyId ? eq(tasks.propertyId, task.propertyId) : undefined,
            task.areaId ? eq(tasks.areaId, task.areaId) : undefined
          )
        );

      // Check if there's already a pending/in-progress task for this recurring series
      // by checking for tasks with due dates on or after the next scheduled date
      const hasPendingTask = existingTasks.some((t) => {
        // If there's any non-completed task from this series, don't create another
        // We use initialDate as fallback if estimatedCompletionDate is null
        const existingDue = t.estimatedCompletionDate 
          ? new Date(t.estimatedCompletionDate)
          : new Date(t.initialDate);
        // Consider it as part of this series if it's for a future date (within 1 day tolerance)
        const dayDiff = (existingDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return dayDiff >= -1; // Allow 1 day grace for tasks that might be slightly past due
      });

      if (hasPendingTask) {
        continue; // Skip - there's already a pending/in-progress task for this series
      }

      // Create the new recurring task instance, preserving all relevant fields
      const newTask = {
        requestId: task.requestId, // Preserve link to original request
        propertyId: task.propertyId,
        spaceId: task.spaceId,
        equipmentId: task.equipmentId,
        vehicleId: task.vehicleId,
        name: task.name,
        description: task.description,
        urgency: task.urgency,
        areaId: task.areaId,
        subdivisionId: task.subdivisionId,
        initialDate: nextDueDate,
        estimatedCompletionDate: nextDueDate,
        assignedToId: task.assignedToId,
        assignedVendorId: task.assignedVendorId,
        taskType: "recurring" as const,
        executorType: task.executorType,
        assignedPool: task.assignedPool,
        status: "not_started" as const,
        recurringFrequency: task.recurringFrequency,
        recurringInterval: task.recurringInterval,
        recurringEndDate: task.recurringEndDate,
        contactType: task.contactType,
        contactStaffId: task.contactStaffId,
        contactName: task.contactName,
        contactEmail: task.contactEmail,
        contactPhone: task.contactPhone,
        instructions: task.instructions,
        requiresPhoto: task.requiresPhoto,
        createdById: task.createdById,
      };

      await db.insert(tasks).values(newTask);
      log(`Created recurring task instance: ${task.name} - Next due: ${nextDueDate.toISOString()}`);
    }
  } catch (error) {
    console.error("Error processing recurring tasks:", error);
  }
}

// Start the recurring task scheduler
export function startRecurringTaskScheduler(): void {
  // Run immediately on startup
  processRecurringTasks();
  
  // Then run every hour (3600000 ms)
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  setInterval(() => {
    log("Running recurring task scheduler...");
    processRecurringTasks();
  }, intervalMs);
  
  log("Recurring task scheduler started (runs every hour)");
}

// Export for manual triggering if needed
export { processRecurringTasks };
