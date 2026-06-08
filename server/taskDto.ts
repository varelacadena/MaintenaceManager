import type { Task } from "@shared/schema";

export type TaskListSummary = {
  id: string;
  name: string;
  status: Task["status"];
  urgency: Task["urgency"];
  areaId: string | null;
  propertyId: string | null;
  assignedToId: string | null;
  assignedVendorId: string | null;
  initialDate: Date | null;
  estimatedCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  projectId: string | null;
  parentTaskId: string | null;
  executorType: Task["executorType"];
  assignedPool: string | null;
  estimateStatus: Task["estimateStatus"] | null;
  taskType: Task["taskType"];
  helperCount?: number;
  isHelper?: boolean;
};

export function toTaskListSummary(task: Task & { helperCount?: number; isHelper?: boolean }): TaskListSummary {
  return {
    id: task.id,
    name: task.name,
    status: task.status,
    urgency: task.urgency,
    areaId: task.areaId,
    propertyId: task.propertyId,
    assignedToId: task.assignedToId,
    assignedVendorId: task.assignedVendorId,
    initialDate: task.initialDate,
    estimatedCompletionDate: task.estimatedCompletionDate,
    actualCompletionDate: task.actualCompletionDate,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    executorType: task.executorType,
    assignedPool: task.assignedPool,
    estimateStatus: task.estimateStatus,
    taskType: task.taskType,
    helperCount: task.helperCount,
    isHelper: task.isHelper,
  };
}
