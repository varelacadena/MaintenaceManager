import type { Task } from "@shared/schema";
import type { SelectedAsset } from "@/components/task-form/TaskLocationFields";
import { apiRequest } from "@/lib/queryClient";

export type AssetWithSubtaskId = SelectedAsset & { subtaskId?: string };

export function isAssetSubtask(subtask: Task): boolean {
  return !!(subtask.equipmentId || subtask.vehicleId);
}

export function assetKey(asset: { type: string; id: string }): string {
  return `${asset.type}:${asset.id}`;
}

export function buildAssetsFromTask(task: Task, subtasks: Task[]): AssetWithSubtaskId[] {
  const assetSubtasks = subtasks.filter(isAssetSubtask);
  if (assetSubtasks.length > 0) {
    return assetSubtasks.map((st) => ({
      type: st.equipmentId ? ("equipment" as const) : ("vehicle" as const),
      id: (st.equipmentId || st.vehicleId)!,
      label: st.equipmentName || st.vehicleName || st.name,
      subtaskId: st.id,
    }));
  }

  if (task.equipmentId) {
    return [{
      type: "equipment",
      id: task.equipmentId,
      label: task.equipmentName || task.equipmentId,
    }];
  }

  if (task.vehicleId) {
    return [{
      type: "vehicle",
      id: task.vehicleId,
      label: task.vehicleName || task.vehicleId,
    }];
  }

  return [];
}

export async function syncTaskAssets(
  taskId: string,
  previousAssets: AssetWithSubtaskId[],
  nextAssets: SelectedAsset[],
): Promise<void> {
  const prevKeys = new Set(previousAssets.map(assetKey));
  const nextKeys = new Set(nextAssets.map(assetKey));

  if (nextAssets.length === 0) {
    for (const asset of previousAssets) {
      if (asset.subtaskId) {
        await apiRequest("DELETE", `/api/tasks/${asset.subtaskId}`);
      }
    }
    if (previousAssets.length > 0) {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, {
        equipmentId: null,
        vehicleId: null,
      });
    }
    return;
  }

  if (nextAssets.length === 1) {
    const asset = nextAssets[0];
    for (const prev of previousAssets) {
      if (prev.subtaskId) {
        await apiRequest("DELETE", `/api/tasks/${prev.subtaskId}`);
      }
    }
    await apiRequest("PATCH", `/api/tasks/${taskId}`, {
      equipmentId: asset.type === "equipment" ? asset.id : null,
      vehicleId: asset.type === "vehicle" ? asset.id : null,
    });
    return;
  }

  await apiRequest("PATCH", `/api/tasks/${taskId}`, {
    equipmentId: null,
    vehicleId: null,
  });

  for (const asset of previousAssets) {
    if (!nextKeys.has(assetKey(asset)) && asset.subtaskId) {
      await apiRequest("DELETE", `/api/tasks/${asset.subtaskId}`);
    }
  }

  for (const asset of nextAssets) {
    const key = assetKey(asset);
    if (!prevKeys.has(key)) {
      await apiRequest("POST", `/api/tasks/${taskId}/subtasks`, {
        equipmentId: asset.type === "equipment" ? asset.id : undefined,
        vehicleId: asset.type === "vehicle" ? asset.id : undefined,
      });
      continue;
    }

    const prev = previousAssets.find((p) => assetKey(p) === key);
    if (prev && !prev.subtaskId) {
      await apiRequest("POST", `/api/tasks/${taskId}/subtasks`, {
        equipmentId: asset.type === "equipment" ? asset.id : undefined,
        vehicleId: asset.type === "vehicle" ? asset.id : undefined,
      });
    }
  }
}
