import {
  uploads,
  type Upload,
  type InsertUpload,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function createUpload(uploadData: InsertUpload): Promise<Upload> {
  console.log("DB: Inserting upload data:", JSON.stringify(uploadData, null, 2));
  const [upload] = await db.insert(uploads).values(uploadData).returning();
  return upload;
}

export async function getUploadsByRequest(requestId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.requestId, requestId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByTask(taskId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.taskId, taskId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByEquipment(equipmentId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.equipmentId, equipmentId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByVehicleCheckOutLog(checkOutLogId: string): Promise<Upload[]> {
  console.log("Fetching uploads for checkout log:", checkOutLogId);
  const results = await db
    .select()
    .from(uploads)
    .where(eq(uploads.vehicleCheckOutLogId, checkOutLogId))
    .orderBy(uploads.createdAt);
  console.log("Found uploads:", results.length);
  return results;
}

export async function getUploadsByVehicleCheckInLog(checkInLogId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.vehicleCheckInLogId, checkInLogId))
    .orderBy(uploads.createdAt);
}

export async function getUpload(id: string): Promise<Upload | undefined> {
  const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
  return upload;
}

export async function deleteUpload(id: string): Promise<void> {
  await db.delete(uploads).where(eq(uploads.id, id));
}
