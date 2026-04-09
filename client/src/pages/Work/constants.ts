import { z } from "zod";
import { taskStatusConfig } from "@/utils/taskUtils";
import type { Task, Project } from "@shared/schema";

export const unifiedStatusConfig = [
  ...taskStatusConfig,
  { key: "cancelled", label: "Cancelled" },
];

export const projectStatusMapping: Record<string, string> = {
  planning: "not_started",
  in_progress: "in_progress",
  on_hold: "on_hold",
  completed: "completed",
  cancelled: "cancelled",
};

export const projectPriorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "text-muted-foreground", label: "Low" },
  medium: { color: "text-amber-500 dark:text-amber-400", label: "Medium" },
  high: { color: "text-red-500 dark:text-red-400", label: "High" },
  critical: { color: "text-red-700 dark:text-red-300 font-semibold", label: "Critical" },
};

export type StatusType = "not_started" | "needs_estimate" | "waiting_approval" | "ready" | "in_progress" | "on_hold" | "completed";

export type WorkItem =
  | { type: "task"; data: Task }
  | { type: "project"; data: Project };

export const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).default("planning"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  propertyId: z.string().nullable().optional(),
  spaceId: z.string().nullable().optional(),
  budgetAmount: z.coerce.number().default(0),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
