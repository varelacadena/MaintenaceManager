import { describe, expect, it } from "vitest";
import {
  assetKey,
  buildAssetsFromTask,
  isAssetSubtask,
} from "@/lib/taskAssetSubtasks";
import type { Task } from "@shared/schema";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    name: "Oil change",
    description: "Change oil",
    urgency: "medium",
    taskType: "one_time",
    status: "not_started",
    initialDate: new Date("2026-01-01"),
    createdById: "user-1",
    ...overrides,
  } as Task;
}

describe("taskAssetSubtasks", () => {
  it("detects asset subtasks by equipment or vehicle id", () => {
    expect(isAssetSubtask(makeTask({ equipmentId: "eq-1" }))).toBe(true);
    expect(isAssetSubtask(makeTask({ vehicleId: "veh-1" }))).toBe(true);
    expect(isAssetSubtask(makeTask({ name: "Manual subtask" }))).toBe(false);
  });

  it("builds assets from equipment subtasks", () => {
    const parent = makeTask();
    const subtasks = [
      makeTask({
        id: "sub-1",
        parentTaskId: "task-1",
        equipmentId: "eq-1",
        equipmentName: "Lift A",
        name: "Oil change — Lift A",
      }),
      makeTask({
        id: "sub-2",
        parentTaskId: "task-1",
        vehicleId: "veh-1",
        vehicleName: "Ford Transit 123",
        name: "Oil change — Ford Transit 123",
      }),
    ];

    expect(buildAssetsFromTask(parent, subtasks)).toEqual([
      { type: "equipment", id: "eq-1", label: "Lift A", subtaskId: "sub-1" },
      { type: "vehicle", id: "veh-1", label: "Ford Transit 123", subtaskId: "sub-2" },
    ]);
  });

  it("falls back to parent task asset when there are no asset subtasks", () => {
    const parent = makeTask({ equipmentId: "eq-9", equipmentName: "Compressor" });
    expect(buildAssetsFromTask(parent, [])).toEqual([
      { type: "equipment", id: "eq-9", label: "Compressor" },
    ]);
  });

  it("creates stable asset keys", () => {
    expect(assetKey({ type: "vehicle", id: "veh-1" })).toBe("vehicle:veh-1");
  });
});
