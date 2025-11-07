import {
  users,
  vendors,
  inventoryItems,
  areas,
  subdivisions,
  serviceRequests,
  tasks,
  timeEntries,
  partsUsed,
  messages,
  uploads,
  taskNotes,
  properties,
  equipment,
  type User,
  type UpsertUser,
  type Vendor,
  type InsertVendor,
  type InventoryItem,
  type InsertInventoryItem,
  type Area,
  type InsertArea,
  type Subdivision,
  type InsertSubdivision,
  type ServiceRequest,
  type InsertServiceRequest,
  type Task,
  type InsertTask,
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
  type Property,
  type InsertProperty,
  type Equipment,
  type InsertEquipment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  updateUser(id: string, userData: {
    username?: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: {
    username: string;
    password: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }): Promise<User>;

  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;

  // Inventory operations
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<void>;
  updateInventoryQuantity(id: string, quantityChange: number): Promise<InventoryItem | undefined>;

  // Area operations
  getAreas(): Promise<Area[]>;
  createArea(area: InsertArea): Promise<Area>;
  deleteArea(id: string): Promise<void>;

  // Subdivision operations
  getSubdivisionsByArea(areaId: string): Promise<Subdivision[]>;
  createSubdivision(subdivision: InsertSubdivision): Promise<Subdivision>;
  deleteSubdivision(id: string): Promise<void>;

  // Service request operations (simplified - requests are just submissions)
  getServiceRequests(filters?: {
    userId?: string;
    status?: string;
  }): Promise<ServiceRequest[]>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined>;
  deleteServiceRequest(id: string): Promise<void>;
  updateServiceRequestStatus(
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<ServiceRequest | undefined>;

  // Task operations (tasks are created from requests and managed by admin/maintenance)
  getTasks(filters?: {
    assignedToId?: string;
    assignedVendorId?: string;
    status?: string;
    areaId?: string;
  }): Promise<Task[]>;
  getTask(id: string | number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  updateTaskStatus(id: string, status: string, onHoldReason?: string, actualCompletionDate?: Date): Promise<Task | undefined>;

  // Time entry operations (linked to tasks)
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  updateTimeEntry(
    id: string,
    endTime: Date,
    durationMinutes: number
  ): Promise<TimeEntry | undefined>;
  getTimeEntriesByTask(taskId: string): Promise<TimeEntry[]>;

  // Parts used operations (linked to tasks)
  createPartUsed(part: InsertPartUsed): Promise<PartUsed>;
  deletePartUsed(id: string): Promise<void>;
  getPartsByTask(taskId: string): Promise<PartUsed[]>;

  // Message operations (can be on requests or tasks)
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRequest(requestId: string): Promise<Message[]>;
  getMessagesByTask(taskId: string): Promise<Message[]>;
  getMessages(): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  markMessagesAsRead(requestId: string, userId: string): Promise<void>;
  markTaskMessagesAsRead(taskId: string, userId: string): Promise<void>;

  // Upload operations (can be on requests or tasks)
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: string): Promise<Upload | undefined>;
  getUploadsByRequest(requestId: string): Promise<Upload[]>;
  getUploadsByTask(taskId: string): Promise<Upload[]>;
  deleteUpload(id: string): Promise<void>;

  // Task note operations (linked to tasks)
  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getTaskNote(id: string): Promise<TaskNote | undefined>;
  getNotesByTask(taskId: string): Promise<TaskNote[]>;
  deleteTaskNote(id: string): Promise<void>;

  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;
  getTasksByProperty(propertyId: string): Promise<Task[]>;

  // Equipment operations
  getEquipment(): Promise<Equipment[]>;
  getEquipmentItem(id: string): Promise<Equipment | undefined>;
  getEquipmentByProperty(propertyId: string): Promise<Equipment[]>;
  getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;
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

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: string, userData: {
    username?: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    return await db.select().from(users).where(
      or(...roles.map(role => eq(users.role, role)))
    );
  }

  async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }


  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(vendorData).returning();
    return vendor;
  }

  async updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...vendorData, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await db.insert(inventoryItems).values(itemData).returning();
    return item;
  }

  async updateInventoryItem(id: string, itemData: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [item] = await db
      .update(inventoryItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async updateInventoryQuantity(id: string, quantityChange: number): Promise<InventoryItem | undefined> {
    const [item] = await db
      .update(inventoryItems)
      .set({ 
        quantity: sql`${inventoryItems.quantity} + ${quantityChange}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
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
    status?: string;
  }): Promise<ServiceRequest[]> {
    let query = db.select().from(serviceRequests);

    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(serviceRequests.requesterId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequest(id: string | number): Promise<ServiceRequest | undefined> {
    if (id === null || id === undefined || id === 'null' || id === 'undefined') {
      return undefined;
    }
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      return undefined;
    }
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, numericId));
    return request;
  }

  async createServiceRequest(
    requestData: InsertServiceRequest
  ): Promise<ServiceRequest> {
    const [request] = await db
      .insert(serviceRequests)
      .values(requestData)
      .returning();
    
    // Ensure ID is properly set
    if (!request.id) {
      throw new Error("Failed to create service request - no ID returned");
    }
    
    return request;
  }

  async updateServiceRequest(id: string | number, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      return undefined;
    }
    const [request] = await db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, numericId))
      .returning();
    return request;
  }

  async deleteServiceRequest(id: string | number): Promise<void> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      return;
    }
    await db.delete(serviceRequests).where(eq(serviceRequests.id, numericId));
  }

  async updateServiceRequestStatus(
    id: string | number,
    status: string,
    rejectionReason?: string
  ): Promise<ServiceRequest | undefined> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      return undefined;
    }
    const [request] = await db
      .update(serviceRequests)
      .set({ status: status as any, rejectionReason, updatedAt: new Date() })
      .where(eq(serviceRequests.id, numericId))
      .returning();
    return request;
  }

  // Task operations
  async getTasks(filters?: {
    assignedToId?: string;
    assignedVendorId?: string;
    status?: string;
    areaId?: string;
  }): Promise<Task[]> {
    let query = db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        urgency: tasks.urgency,
        status: tasks.status,
        assignedTo: tasks.assignedTo,
        requestId: tasks.requestId,
        areaId: tasks.areaId,
        propertyId: tasks.propertyId,
        scheduledDate: tasks.scheduledDate,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(serviceRequests, eq(tasks.requestId, serviceRequests.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(areas, eq(tasks.areaId, areas.id));

    const conditions = [];
    if (filters?.assignedToId) {
      conditions.push(eq(tasks.assignedToId, filters.assignedToId));
    }
    if (filters?.assignedVendorId) {
      conditions.push(eq(tasks.assignedVendorId, filters.assignedVendorId));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.areaId) {
      conditions.push(eq(tasks.areaId, filters.areaId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(tasks.initialDate));
  }

  async getTask(id: string | number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, typeof id === 'string' ? parseInt(id, 10) : id));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(taskData)
      .returning();
    return task;
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async updateTaskStatus(
    id: string,
    status: string,
    onHoldReason?: string,
    actualCompletionDate?: Date
  ): Promise<Task | undefined> {
    const updateData: any = { 
      status: status as any, 
      updatedAt: new Date() 
    };

    if (onHoldReason !== undefined) {
      updateData.onHoldReason = onHoldReason;
    }

    if (actualCompletionDate !== undefined) {
      updateData.actualCompletionDate = actualCompletionDate;
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
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

  async getTimeEntriesByTask(taskId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId));
  }

  // Parts used operations
  async createPartUsed(partData: InsertPartUsed): Promise<PartUsed> {
    // Database trigger automatically updates inventory quantities
    const [part] = await db.insert(partsUsed).values(partData).returning();
    return part;
  }

  async deletePartUsed(id: string): Promise<void> {
    // Database trigger will automatically restore inventory quantity
    await db.delete(partsUsed).where(eq(partsUsed.id, id));
  }

  async getPartsByTask(taskId: string): Promise<PartUsed[]> {
    return await db
      .select()
      .from(partsUsed)
      .where(eq(partsUsed.taskId, taskId));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessagesByRequest(requestId: string): Promise<Message[]>;
  async getMessagesByTask(taskId: string): Promise<Message[]>;
  async getMessages(): Promise<Message[]>;

  async getMessagesByRequest(requestId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.requestId, requestId))
      .orderBy(messages.createdAt);
  }

  async getMessagesByTask(taskId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.createdAt);
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async markMessagesAsRead(requestId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.requestId, requestId),
          ne(messages.senderId, userId)
        )
      );
  }

  async markTaskMessagesAsRead(taskId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.taskId, taskId),
          ne(messages.senderId, userId)
        )
      );
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  // Upload operations
  async createUpload(uploadData: InsertUpload): Promise<Upload> {
    const [upload] = await db.insert(uploads).values(uploadData).returning();
    return upload;
  }

  async getUpload(id: string): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    return upload;
  }

  async getUploadsByRequest(requestId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.requestId, requestId));
  }

  async getUploadsByTask(taskId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.taskId, taskId));
  }

  async deleteUpload(id: string): Promise<void> {
    await db.delete(uploads).where(eq(uploads.id, id));
  }

  // Task note operations
  async createTaskNote(noteData: InsertTaskNote): Promise<TaskNote> {
    const [note] = await db.insert(taskNotes).values(noteData).returning();
    return note;
  }

  async getTaskNote(id: string): Promise<TaskNote | undefined> {
    const [note] = await db.select().from(taskNotes).where(eq(taskNotes.id, id));
    return note;
  }

  async getNotesByTask(taskId: string): Promise<TaskNote[]> {
    return await db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(taskNotes.createdAt);
  }

  async deleteTaskNote(id: string): Promise<void> {
    await db.delete(taskNotes).where(eq(taskNotes.id, id));
  }

  // Property operations
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(propertyData).returning();
    return property;
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getTasksByProperty(propertyId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.propertyId, propertyId))
      .orderBy(desc(tasks.initialDate));
  }

  // Equipment operations
  async getEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment).orderBy(equipment.name);
  }

  async getEquipmentItem(id: string): Promise<Equipment | undefined> {
    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    return item;
  }

  async getEquipmentByProperty(propertyId: string): Promise<Equipment[]> {
    return await db
      .select()
      .from(equipment)
      .where(eq(equipment.propertyId, propertyId))
      .orderBy(equipment.category, equipment.name);
  }

  async getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]> {
    return await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.propertyId, propertyId), eq(equipment.category, category as any)))
      .orderBy(equipment.name);
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [item] = await db.insert(equipment).values(equipmentData).returning();
    return item;
  }

  async updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [item] = await db
      .update(equipment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();
    return item;
  }

  async deleteEquipment(id: string): Promise<void> {
    await db.delete(equipment).where(eq(equipment.id, id));
  }
}

export const storage = new DatabaseStorage();