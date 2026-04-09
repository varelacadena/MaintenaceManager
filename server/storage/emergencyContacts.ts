import {
  emergencyContacts,
  type EmergencyContact,
  type InsertEmergencyContact,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, or, ne, desc, isNull, sql } from "drizzle-orm";

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  return await db
    .select()
    .from(emergencyContacts)
    .orderBy(desc(emergencyContacts.createdAt));
}

export async function getActiveEmergencyContact(): Promise<EmergencyContact | undefined> {
  const now = new Date();
  const [contact] = await db
    .select()
    .from(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.isActive, true),
        or(
          isNull(emergencyContacts.validFrom),
          sql`${emergencyContacts.validFrom} <= ${now}`
        ),
        or(
          isNull(emergencyContacts.validUntil),
          sql`${emergencyContacts.validUntil} >= ${now}`
        )
      )
    )
    .orderBy(desc(emergencyContacts.updatedAt))
    .limit(1);
  return contact;
}

export async function getEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
  const [contact] = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.id, id));
  return contact;
}

export async function createEmergencyContact(contactData: InsertEmergencyContact): Promise<EmergencyContact> {
  if (contactData.isActive) {
    await db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() });
  }
  
  const [contact] = await db
    .insert(emergencyContacts)
    .values(contactData)
    .returning();
  return contact;
}

export async function updateEmergencyContact(
  id: string,
  data: Partial<InsertEmergencyContact>
): Promise<EmergencyContact | undefined> {
  if (data.isActive) {
    await db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(ne(emergencyContacts.id, id));
  }

  const [contact] = await db
    .update(emergencyContacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emergencyContacts.id, id))
    .returning();
  return contact;
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
}

export async function setActiveEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
  await db
    .update(emergencyContacts)
    .set({ isActive: false, updatedAt: new Date() });
  
  const [contact] = await db
    .update(emergencyContacts)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(emergencyContacts.id, id))
    .returning();
  return contact;
}

export async function clearActiveEmergencyContact(): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ isActive: false, updatedAt: new Date() });
}
