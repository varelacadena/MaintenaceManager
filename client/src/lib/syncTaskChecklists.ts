import { apiRequest } from "@/lib/queryClient";
import type { TaskChecklistGroup, TaskChecklistItem } from "@shared/schema";

export type EditableChecklistItem = {
  id?: string;
  text: string;
  isCompleted: boolean;
};

export type EditableChecklistGroup = {
  id?: string;
  name: string;
  items: EditableChecklistItem[];
};

type GroupWithItems = TaskChecklistGroup & { items: TaskChecklistItem[] };

export function toEditableChecklistGroups(
  groups: GroupWithItems[],
): EditableChecklistGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    items: group.items.map((item) => ({
      id: item.id,
      text: item.text,
      isCompleted: item.isCompleted ?? false,
    })),
  }));
}

export async function syncTaskChecklists(
  taskId: string,
  original: GroupWithItems[],
  current: EditableChecklistGroup[],
): Promise<void> {
  const originalById = new Map(original.map((group) => [group.id, group]));
  const currentGroupIds = new Set(current.filter((group) => group.id).map((group) => group.id!));

  for (const group of original) {
    if (!currentGroupIds.has(group.id)) {
      await apiRequest("DELETE", `/api/checklist-groups/${group.id}`);
    }
  }

  for (let groupIndex = 0; groupIndex < current.length; groupIndex++) {
    const group = current[groupIndex];

    if (!group.id) {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/checklist-groups`, {
        name: group.name,
        sortOrder: groupIndex,
      });
      const createdGroup = await response.json();
      for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
        const item = group.items[itemIndex];
        await apiRequest("POST", `/api/checklist-groups/${createdGroup.id}/items`, {
          text: item.text,
          isCompleted: item.isCompleted,
          sortOrder: itemIndex,
        });
      }
      continue;
    }

    const originalGroup = originalById.get(group.id);
    if (!originalGroup) continue;

    if (originalGroup.name !== group.name) {
      await apiRequest("PATCH", `/api/checklist-groups/${group.id}`, { name: group.name });
    }

    const originalItemsById = new Map(originalGroup.items.map((item) => [item.id, item]));
    const currentItemIds = new Set(group.items.filter((item) => item.id).map((item) => item.id!));

    for (const originalItem of originalGroup.items) {
      if (!currentItemIds.has(originalItem.id)) {
        await apiRequest("DELETE", `/api/checklist-items/${originalItem.id}`);
      }
    }

    for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
      const item = group.items[itemIndex];
      if (!item.id) {
        await apiRequest("POST", `/api/checklist-groups/${group.id}/items`, {
          text: item.text,
          isCompleted: item.isCompleted,
          sortOrder: itemIndex,
        });
        continue;
      }

      const originalItem = originalItemsById.get(item.id);
      if (!originalItem) continue;

      const patch: { text?: string; isCompleted?: boolean } = {};
      if (originalItem.text !== item.text) patch.text = item.text;
      if (originalItem.isCompleted !== item.isCompleted) patch.isCompleted = item.isCompleted;
      if (Object.keys(patch).length > 0) {
        await apiRequest("PATCH", `/api/checklist-items/${item.id}`, patch);
      }
    }
  }
}
