import {
  LIFE_SAFETY_DEFAULT_DESCRIPTION,
  LIFE_SAFETY_DEFAULT_NAME,
  compareLifeSafetyItems,
  equipmentIdFromScan,
  isLifeSafetyCategory,
  isLifeSafetyDue,
  lifeSafetyNextDue,
  lifeSafetyPlace,
  startOfLocalDay,
} from "@shared/lifeSafety";
import type { InsertTask, LifeSafetyCheck, Task, User } from "@shared/schema";
import { storage } from "./storage";
import {
  countPendingLifeSafetyChecks,
  getLatestLifeSafetyTask,
  getLifeSafetyCheck,
  getLifeSafetyChecks,
  insertLifeSafetyChecks,
  lifeSafetyTaskExistsOnDay,
  listLifeSafetyPropertyIds,
  updateLifeSafetyCheck,
} from "./storage/lifeSafety";

export async function snapshotLifeSafetyChecks(taskId: string, propertyId: string): Promise<number> {
  const [equipment, spaces] = await Promise.all([
    storage.getEquipmentByProperty(propertyId),
    storage.getSpacesByProperty(propertyId),
  ]);
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const rows = equipment
    .filter((item) => isLifeSafetyCategory(item.category))
    .map((item) => {
      const space = item.spaceId ? spaceById.get(item.spaceId) : undefined;
      return {
        equipmentId: item.id,
        equipmentName: item.name,
        assetTag: item.assetTag,
        category: item.category.toLowerCase(),
        spaceName: space?.name ?? null,
        floor: space?.floor ?? null,
      };
    })
    .sort(compareLifeSafetyItems);

  await insertLifeSafetyChecks(
    rows.map((row, index) => ({
      taskId,
      ...row,
      sortOrder: index,
    })),
  );
  return rows.length;
}

export async function createLifeSafetyTask(input: InsertTask): Promise<Task> {
  if (!input.propertyId) {
    throw new Error("A life safety round needs a property");
  }
  const task = await storage.createTask({
    ...input,
    propertyId: input.propertyId,
    propertyIds: null,
    isCampusWide: false,
    spaceId: null,
    equipmentId: null,
    vehicleId: null,
    lifeSafetyRound: true,
    taskType: "recurring",
    recurringFrequency: "weekly",
    recurringInterval: input.recurringInterval && input.recurringInterval > 0 ? input.recurringInterval : 1,
    name: input.name?.trim() || LIFE_SAFETY_DEFAULT_NAME,
    description: input.description?.trim() || LIFE_SAFETY_DEFAULT_DESCRIPTION,
  });
  await snapshotLifeSafetyChecks(task.id, input.propertyId);
  return task;
}

function displayName(user: User): string {
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.username;
}

export async function recordLifeSafetyPass(check: LifeSafetyCheck, scan: string, user: User): Promise<LifeSafetyCheck> {
  if (check.result !== "pending") {
    throw Object.assign(new Error("This unit is already recorded."), { status: 409 });
  }
  const equipmentId = await resolveScannedEquipmentId(scan);
  if (!equipmentId) {
    throw Object.assign(new Error("No equipment matched that code."), { status: 404 });
  }
  if (equipmentId !== check.equipmentId) {
    const checks = await getLifeSafetyChecks(check.taskId);
    const other = checks.find((row) => row.equipmentId === equipmentId);
    const message = other
      ? `That sticker is ${lifeSafetyPlace(other.spaceName, other.floor)}, ${other.equipmentName}.`
      : "That sticker is not on this week's list.";
    throw Object.assign(new Error(message), { status: 409 });
  }
  const updated = await updateLifeSafetyCheck(check.id, {
    result: "pass",
    checkedById: user.id,
    checkedByName: displayName(user),
    checkedAt: new Date(),
  });
  if (!updated) throw new Error("Could not save this check");
  return updated;
}

export async function recordLifeSafetyProblem(
  check: LifeSafetyCheck,
  note: string,
  user: User,
): Promise<LifeSafetyCheck> {
  if (check.result !== "pending") {
    throw Object.assign(new Error("This unit is already recorded."), { status: 409 });
  }
  const trimmed = note.trim();
  if (trimmed.length < 3) {
    throw Object.assign(new Error("Write a short note about the problem."), { status: 400 });
  }
  const parent = await storage.getTask(check.taskId);
  if (!parent) throw Object.assign(new Error("Task not found"), { status: 404 });

  const equipment = check.equipmentId ? await storage.getEquipmentItem(check.equipmentId) : undefined;
  const repair = await storage.createTask({
    name: `Repair ${check.equipmentName}`.slice(0, 200),
    description: trimmed,
    urgency: "high",
    initialDate: new Date(),
    estimatedCompletionDate: new Date(),
    propertyId: parent.propertyId,
    spaceId: equipment?.spaceId ?? null,
    equipmentId: check.equipmentId,
    taskType: "one_time",
    executorType: "technician",
    assignedPool: "technician_pool",
    status: "not_started",
    lifeSafetyRound: false,
    createdById: user.id,
  });

  const updated = await updateLifeSafetyCheck(check.id, {
    result: "problem",
    problemNote: trimmed,
    checkedById: user.id,
    checkedByName: displayName(user),
    checkedAt: new Date(),
    repairTaskId: repair.id,
  });
  if (!updated) throw new Error("Could not save this check");
  return updated;
}

async function resolveScannedEquipmentId(scan: string): Promise<string | null> {
  const fromUrl = equipmentIdFromScan(scan);
  if (fromUrl) {
    const item = await storage.getEquipmentItem(fromUrl);
    if (item) return item.id;
  }
  const tag = scan.trim();
  if (!tag) return null;
  const byTag = await storage.getEquipmentByAssetTag(tag);
  return byTag?.id ?? null;
}

export async function assertLifeSafetyReadyToFinish(taskId: string): Promise<string | null> {
  const pending = await countPendingLifeSafetyChecks(taskId);
  if (pending > 0) {
    return "Scan each smoke detector and exit sign, or mark a problem, before finishing.";
  }
  return null;
}

export async function createDueLifeSafetyRounds(now = new Date()): Promise<number> {
  const propertyIds = await listLifeSafetyPropertyIds();
  let created = 0;
  for (const propertyId of propertyIds) {
    const latest = await getLatestLifeSafetyTask(propertyId);
    if (!latest?.recurringFrequency || !latest.initialDate) continue;
    if (latest.recurringEndDate) {
      const end = new Date(latest.recurringEndDate);
      if (!Number.isNaN(end.getTime()) && startOfLocalDay(now).getTime() > startOfLocalDay(end).getTime()) {
        continue;
      }
    }
    const nextDue = lifeSafetyNextDue(new Date(latest.initialDate), latest.recurringInterval || 1);
    if (!isLifeSafetyDue(nextDue, now)) continue;
    if (latest.recurringEndDate) {
      const end = new Date(latest.recurringEndDate);
      if (!Number.isNaN(end.getTime()) && startOfLocalDay(nextDue).getTime() > startOfLocalDay(end).getTime()) {
        continue;
      }
    }
    const dayStart = startOfLocalDay(nextDue);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    if (await lifeSafetyTaskExistsOnDay(propertyId, dayStart, dayEnd)) continue;

    await createLifeSafetyTask({
      name: latest.name,
      description: latest.description,
      urgency: latest.urgency,
      initialDate: dayStart,
      estimatedCompletionDate: dayStart,
      propertyId,
      assignedToId: latest.assignedToId,
      assignedVendorId: latest.assignedVendorId,
      executorType: latest.executorType,
      assignedPool: latest.assignedToId || latest.assignedVendorId ? null : latest.assignedPool,
      instructions: latest.instructions,
      createdById: latest.createdById,
      areaId: latest.areaId,
      subdivisionId: latest.subdivisionId,
      recurringFrequency: "weekly",
      recurringInterval: latest.recurringInterval || 1,
      recurringEndDate: latest.recurringEndDate,
      contactType: latest.contactType,
      contactName: latest.contactName,
      contactEmail: latest.contactEmail,
      contactPhone: latest.contactPhone,
      status: "not_started",
      lifeSafetyRound: true,
      taskType: "recurring",
    });
    created += 1;
  }
  return created;
}

export async function loadLifeSafetyCheckForTask(taskId: string, checkId: string): Promise<LifeSafetyCheck | undefined> {
  const check = await getLifeSafetyCheck(checkId);
  if (!check || check.taskId !== taskId) return undefined;
  return check;
}
