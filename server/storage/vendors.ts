import {
  vendors,
  type Vendor,
  type InsertVendor,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getVendors(): Promise<Vendor[]> {
  return await db.select().from(vendors);
}

export async function getVendor(id: string): Promise<Vendor | undefined> {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
  return vendor;
}

export async function createVendor(vendorData: InsertVendor): Promise<Vendor> {
  const [vendor] = await db.insert(vendors).values(vendorData).returning();
  return vendor;
}

export async function updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
  const [vendor] = await db
    .update(vendors)
    .set({ ...vendorData, updatedAt: new Date() })
    .where(eq(vendors.id, id))
    .returning();
  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  await db.delete(vendors).where(eq(vendors.id, id));
}
