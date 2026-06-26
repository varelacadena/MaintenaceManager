export {
  formatUserDisplayName,
  formatVehicleDisplayName,
  formatEquipmentDisplayName,
  resolveUserDisplayName,
  resolveEntityDisplayName,
  type UserNameFields,
} from "@shared/displayNames";

import type { Task, TimeEntry, TaskNote, User } from "@shared/schema";
import { resolveUserDisplayName, resolveEntityDisplayName } from "@shared/displayNames";

export function resolveTaskAssigneeName(task: Task, users?: User[]): string {
  return resolveUserDisplayName({
    userId: task.assignedToId,
    snapshotName: task.assignedToName,
    users,
  });
}

export function resolveTaskCreatorName(task: Task, users?: User[]): string {
  return resolveUserDisplayName({
    userId: task.createdById,
    snapshotName: task.createdByName,
    users,
  });
}

export function resolveTaskPropertyName(
  task: Task,
  properties?: { id: string; name: string }[],
): string {
  const liveName = task.propertyId
    ? properties?.find((p) => p.id === task.propertyId)?.name
    : undefined;
  return resolveEntityDisplayName({
    entityId: task.propertyId,
    snapshotName: task.propertyName,
    liveName,
    fallback: "—",
  });
}

export function resolveTimeEntryUserName(entry: TimeEntry, users?: User[]): string {
  return resolveUserDisplayName({
    userId: entry.userId,
    snapshotName: entry.userName,
    users,
  });
}

export function resolveTaskNoteUserName(note: TaskNote, users?: User[]): string {
  return resolveUserDisplayName({
    userId: note.userId,
    snapshotName: note.userName,
    users,
  });
}
