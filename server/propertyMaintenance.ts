import { storage } from "./storage";

/** Updates lastWorkDate on properties linked to a completed task. */
export async function touchPropertyLastWorkFromTask(task: {
  propertyId?: string | null;
  propertyIds?: string[] | null;
  actualCompletionDate?: Date | null;
  updatedAt?: Date | null;
}) {
  const workDate = task.actualCompletionDate ?? task.updatedAt ?? new Date();
  const propertyIds = new Set<string>();

  if (task.propertyId) {
    propertyIds.add(task.propertyId);
  }
  if (task.propertyIds?.length) {
    for (const id of task.propertyIds) {
      propertyIds.add(id);
    }
  }

  if (propertyIds.size === 0) {
    return;
  }

  await Promise.all(
    Array.from(propertyIds).map((propertyId) =>
      storage.updateProperty(propertyId, { lastWorkDate: workDate })
    )
  );
}
