import {
  users,
  areas,
  subdivisions,
  serviceRequests,
  timeEntries,
  partsUsed,
  messages,
  uploads,
  taskNotes,
  type User,
  type UpsertUser,
  type Area,
  type InsertArea,
  type Subdivision,
  type InsertSubdivision,
  type ServiceRequest,
  type InsertServiceRequest,
  type TimeEntry,
  type InsertTimeEntry,
  type PartUsed,
  type InsertPartUsed,
  type Message,
  type InsertMessage,
  type Upload,
  type InsertUpload,
  type TaskNote,
  type InsertTaskNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Area operations
  getAreas(): Promise<Area[]>;
  createArea(area: InsertArea): Promise<Area>;
  deleteArea(id: string): Promise<void>;

  // Subdivision operations
  getSubdivisionsByArea(areaId: string): Promise<Subdivision[]>;
  createSubdivision(subdivision: InsertSubdivision): Promise<Subdivision>;
  deleteSubdivision(id: string): Promise<void>;

  // Service request operations
  getServiceRequests(filters?: {
    userId?: string;
    assignedToId?: string;
    status?: string;
  }): Promise<ServiceRequest[]>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequestStatus(
    id: string,
    status: string,
    onHoldReason?: string
  ): Promise<ServiceRequest | undefined>;
  updateServiceRequestAssignment(
    id: string,
    assignedToId: string
  ): Promise<ServiceRequest | undefined>;

  // Time entry operations
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  updateTimeEntry(
    id: string,
    endTime: Date,
    durationMinutes: number
  ): Promise<TimeEntry | undefined>;
  getTimeEntriesByRequest(requestId: string): Promise<TimeEntry[]>;

  // Parts used operations
  createPartUsed(part: InsertPartUsed): Promise<PartUsed>;
  getPartsByRequest(requestId: string): Promise<PartUsed[]>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRequest(requestId: string): Promise<Message[]>;

  // Upload operations
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUploadsByRequest(requestId: string): Promise<Upload[]>;

  // Task note operations
  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getNotesByRequest(requestId: string): Promise<TaskNote[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Area operations
  async getAreas(): Promise<Area[]> {
    return await db.select().from(areas);
  }

  async createArea(areaData: InsertArea): Promise<Area> {
    const [area] = await db.insert(areas).values(areaData).returning();
    return area;
  }

  async deleteArea(id: string): Promise<void> {
    await db.delete(areas).where(eq(areas.id, id));
  }

  // Subdivision operations
  async getSubdivisionsByArea(areaId: string): Promise<Subdivision[]> {
    return await db
      .select()
      .from(subdivisions)
      .where(eq(subdivisions.areaId, areaId));
  }

  async createSubdivision(
    subdivisionData: InsertSubdivision
  ): Promise<Subdivision> {
    const [subdivision] = await db
      .insert(subdivisions)
      .values(subdivisionData)
      .returning();
    return subdivision;
  }

  async deleteSubdivision(id: string): Promise<void> {
    await db.delete(subdivisions).where(eq(subdivisions.id, id));
  }

  // Service request operations
  async getServiceRequests(filters?: {
    userId?: string;
    assignedToId?: string;
    status?: string;
  }): Promise<ServiceRequest[]> {
    let query = db.select().from(serviceRequests);

    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(serviceRequests.requesterId, filters.userId));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(serviceRequests.assignedToId, filters.assignedToId));
    }
    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id));
    return request;
  }

  async createServiceRequest(
    requestData: InsertServiceRequest
  ): Promise<ServiceRequest> {
    const [request] = await db
      .insert(serviceRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateServiceRequestStatus(
    id: string,
    status: string,
    onHoldReason?: string
  ): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .update(serviceRequests)
      .set({ status: status as any, onHoldReason, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }

  async updateServiceRequestAssignment(
    id: string,
    assignedToId: string
  ): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .update(serviceRequests)
      .set({ assignedToId, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }

  // Time entry operations
  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));
    return entry;
  }

  async updateTimeEntry(
    id: string,
    endTime: Date,
    durationMinutes: number
  ): Promise<TimeEntry | undefined> {
    const [entry] = await db
      .update(timeEntries)
      .set({ endTime, durationMinutes })
      .where(eq(timeEntries.id, id))
      .returning();
    return entry;
  }

  async getTimeEntriesByRequest(requestId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.requestId, requestId));
  }

  // Parts used operations
  async createPartUsed(partData: InsertPartUsed): Promise<PartUsed> {
    const [part] = await db.insert(partsUsed).values(partData).returning();
    return part;
  }

  async getPartsByRequest(requestId: string): Promise<PartUsed[]> {
    return await db
      .select()
      .from(partsUsed)
      .where(eq(partsUsed.requestId, requestId));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessagesByRequest(requestId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.requestId, requestId))
      .orderBy(messages.createdAt);
  }

  // Upload operations
  async createUpload(uploadData: InsertUpload): Promise<Upload> {
    const [upload] = await db.insert(uploads).values(uploadData).returning();
    return upload;
  }

  async getUploadsByRequest(requestId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.requestId, requestId));
  }

  // Task note operations
  async createTaskNote(noteData: InsertTaskNote): Promise<TaskNote> {
    const [note] = await db.insert(taskNotes).values(noteData).returning();
    return note;
  }

  async getNotesByRequest(requestId: string): Promise<TaskNote[]> {
    return await db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.requestId, requestId))
      .orderBy(taskNotes.createdAt);
  }
}

export const storage = new DatabaseStorage();
