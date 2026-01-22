import { db } from "./db";
import { vehicleDocuments, vehicles, notifications } from "@shared/schema";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";
import { log } from "./vite";
import { storage } from "./storage";

interface ExpiringDocument {
  id: string;
  vehicleId: string;
  documentType: string;
  documentName: string | null;
  expirationDate: Date;
  notes: string | null;
  reminderSent: boolean | null;
  vehicle: {
    id: string;
    vehicleId: string;
    make: string;
    model: string;
  };
  daysUntilExpiration: number;
}

async function getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const now = new Date();
  
  const results = await db
    .select({
      id: vehicleDocuments.id,
      vehicleId: vehicleDocuments.vehicleId,
      documentType: vehicleDocuments.documentType,
      documentName: vehicleDocuments.documentName,
      expirationDate: vehicleDocuments.expirationDate,
      notes: vehicleDocuments.notes,
      reminderSent: vehicleDocuments.reminderSent,
      vehicle: {
        id: vehicles.id,
        vehicleId: vehicles.vehicleId,
        make: vehicles.make,
        model: vehicles.model,
      }
    })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
    .where(
      and(
        lte(vehicleDocuments.expirationDate, futureDate),
        gte(vehicleDocuments.expirationDate, now),
        or(eq(vehicleDocuments.reminderSent, false), isNull(vehicleDocuments.reminderSent))
      )
    )
    .orderBy(vehicleDocuments.expirationDate);
  
  return results.map(doc => ({
    ...doc,
    daysUntilExpiration: Math.ceil((new Date(doc.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }));
}

async function markReminderSent(documentId: string): Promise<void> {
  await db
    .update(vehicleDocuments)
    .set({ 
      reminderSent: true, 
      reminderSentAt: new Date(),
      updatedAt: new Date() 
    })
    .where(eq(vehicleDocuments.id, documentId));
}

const documentTypeLabels: Record<string, string> = {
  insurance: "Insurance",
  annual_inspection: "Annual Inspection",
  registration: "Registration",
  other: "Other Document",
};

async function processDocumentExpirationReminders(): Promise<void> {
  try {
    const expiringDocuments = await getExpiringDocuments(30);
    
    if (expiringDocuments.length === 0) {
      log("No documents expiring within 30 days");
      return;
    }
    
    log(`Found ${expiringDocuments.length} document(s) expiring within 30 days:`);
    
    for (const doc of expiringDocuments) {
      const docTypeName = documentTypeLabels[doc.documentType] || doc.documentType;
      const vehicleName = `${doc.vehicle.make} ${doc.vehicle.model} (${doc.vehicle.vehicleId})`;
      
      log(`  - ${docTypeName} for ${vehicleName} expires in ${doc.daysUntilExpiration} days (${new Date(doc.expirationDate).toLocaleDateString()})`);
      
      // Create in-app notification (visible to all admins since userId is null)
      await storage.createNotification({
        userId: null, // Visible to all users
        type: "document_expiration",
        title: `${docTypeName} Expiring Soon`,
        message: `${docTypeName} for ${vehicleName} expires in ${doc.daysUntilExpiration} days (${new Date(doc.expirationDate).toLocaleDateString()})`,
        link: `/vehicles/${doc.vehicle.id}`,
        relatedId: doc.id,
        relatedType: "vehicle_document",
      });
      
      await markReminderSent(doc.id);
    }
    
    log(`Processed ${expiringDocuments.length} document expiration reminder(s)`);
  } catch (error) {
    log(`Error processing document expiration reminders: ${error}`, "error");
  }
}

export function startDocumentExpirationScheduler(): void {
  processDocumentExpirationReminders();
  
  const intervalMs = 24 * 60 * 60 * 1000;
  
  setInterval(() => {
    log("Running document expiration reminder scheduler...");
    processDocumentExpirationReminders();
  }, intervalMs);
  
  log("Document expiration scheduler started (runs every 24 hours)");
}

export { processDocumentExpirationReminders, getExpiringDocuments };
