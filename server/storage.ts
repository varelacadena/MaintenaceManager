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
  taskChecklists,
  taskChecklistGroups,
  taskChecklistItems,
  checklistTemplates,
  properties,
  spaces,
  equipment,
  lockboxes,
  lockboxCodes,
  vehicles,
  vehicleReservations,
  vehicleCheckOutLogs,
  vehicleCheckInLogs,
  vehicleMaintenanceSchedules,
  vehicleMaintenanceLogs,
  vehicleDocuments,
  emergencyContacts,
  notifications,
  projects,
  projectTeamMembers,
  projectVendors,
  quotes,
  quoteAttachments,
  emailTemplates,
  emailLogs,
  notificationSettings,
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
  type TaskChecklist,
  type InsertTaskChecklist,
  type TaskChecklistGroup,
  type InsertTaskChecklistGroup,
  type TaskChecklistItem,
  type InsertTaskChecklistItem,
  type ChecklistTemplate,
  type InsertChecklistTemplate,
  type Property,
  type InsertProperty,
  type Space,
  type InsertSpace,
  type Equipment,
  type InsertEquipment,
  type Lockbox,
  type InsertLockbox,
  type LockboxCode,
  type InsertLockboxCode,
  type Vehicle,
  type InsertVehicle,
  type VehicleReservation,
  type InsertVehicleReservation,
  type VehicleCheckOutLog,
  type InsertVehicleCheckOutLog,
  type VehicleCheckInLog,
  type InsertVehicleCheckInLog,
  type VehicleMaintenanceSchedule,
  type InsertVehicleMaintenanceSchedule,
  type VehicleMaintenanceLog,
  type InsertVehicleMaintenanceLog,
  type VehicleDocument,
  type InsertVehicleDocument,
  type EmergencyContact,
  type InsertEmergencyContact,
  type Notification,
  type InsertNotification,
  type Project,
  type InsertProject,
  type ProjectTeamMember,
  type InsertProjectTeamMember,
  type ProjectVendor,
  type InsertProjectVendor,
  type Quote,
  type InsertQuote,
  type QuoteAttachment,
  type InsertQuoteAttachment,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailLog,
  type InsertEmailLog,
  type NotificationSetting,
  type InsertNotificationSetting,
  availabilitySchedules,
  userSkills,
  taskDependencies,
  slaConfigs,
  aiAgentLogs,
  type AvailabilitySchedule,
  type InsertAvailabilitySchedule,
  type UserSkill,
  type InsertUserSkill,
  type TaskDependency,
  type InsertTaskDependency,
  type SlaConfig,
  type InsertSlaConfig,
  type AiAgentLog,
  type InsertAiAgentLog,
  passwordResetTokens,
  type PasswordResetToken,
  resourceCategories,
  resourceFolders,
  resources,
  propertyResources,
  type ResourceCategory,
  type InsertResourceCategory,
  type ResourceFolder,
  type InsertResourceFolder,
  type Resource,
  type InsertResource,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, ne, isNull, lte, gte } from "drizzle-orm";

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
    executorType?: string;
    assignedToIdOrPool?: { userId: string; pool: string };
  }): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  createTaskWithChecklists(task: InsertTask, checklists: Omit<InsertTaskChecklist, 'taskId'>[]): Promise<{ task: Task; checklists: TaskChecklist[] }>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  updateTaskStatus(id: string, status: string, onHoldReason?: string, actualCompletionDate?: Date): Promise<Task | undefined>;
  getSubTasks(parentTaskId: string): Promise<Task[]>;

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

  // Task note operations
  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getTaskNote(id: string): Promise<TaskNote | undefined>;
  getNotesByTask(taskId: string): Promise<TaskNote[]>;
  deleteTaskNote(id: string): Promise<void>;

  // Task checklist operations (legacy flat model)
  getChecklistsByTask(taskId: string): Promise<TaskChecklist[]>;
  getTaskChecklist(id: string): Promise<TaskChecklist | undefined>;
  createTaskChecklist(checklist: InsertTaskChecklist): Promise<TaskChecklist>;
  updateTaskChecklist(id: string, data: Partial<InsertTaskChecklist>): Promise<TaskChecklist | undefined>;
  deleteTaskChecklist(id: string): Promise<void>;
  createTaskChecklists(checklists: InsertTaskChecklist[]): Promise<TaskChecklist[]>;

  // Task checklist group/item operations (named checklists)
  getChecklistGroupsByTask(taskId: string): Promise<(TaskChecklistGroup & { items: TaskChecklistItem[] })[]>;
  getChecklistGroup(id: string): Promise<TaskChecklistGroup | undefined>;
  createChecklistGroup(group: InsertTaskChecklistGroup): Promise<TaskChecklistGroup>;
  updateChecklistGroup(id: string, data: Partial<InsertTaskChecklistGroup>): Promise<TaskChecklistGroup | undefined>;
  deleteChecklistGroup(id: string): Promise<void>;
  getChecklistItem(id: string): Promise<TaskChecklistItem | undefined>;
  createChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem>;
  updateChecklistItem(id: string, data: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem | undefined>;
  deleteChecklistItem(id: string): Promise<void>;
  createTaskWithChecklistGroups(
    taskData: InsertTask,
    groups: { name: string; sortOrder?: number; items: { text: string; isCompleted?: boolean; sortOrder?: number }[] }[]
  ): Promise<{ task: Task; groups: (TaskChecklistGroup & { items: TaskChecklistItem[] })[] }>;

  // Upload operations (can be on requests, tasks, equipment, or vehicle logs)
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUploadsByRequest(requestId: string): Promise<Upload[]>;
  getUploadsByTask(taskId: string): Promise<Upload[]>;
  getUploadsByEquipment(equipmentId: string): Promise<Upload[]>;
  getUploadsByVehicleCheckOutLog(checkOutLogId: string): Promise<Upload[]>;
  getUploadsByVehicleCheckInLog(checkInLogId: string): Promise<Upload[]>;
  getUpload(id: string): Promise<Upload | undefined>;
  deleteUpload(id: string): Promise<void>;

  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;
  getTasksByProperty(propertyId: string): Promise<Task[]>;

  // Space operations (rooms within buildings)
  getSpaces(): Promise<Space[]>;
  getSpace(id: string): Promise<Space | undefined>;
  getSpacesByProperty(propertyId: string): Promise<Space[]>;
  createSpace(space: InsertSpace): Promise<Space>;
  updateSpace(id: string, data: Partial<InsertSpace>): Promise<Space | undefined>;
  deleteSpace(id: string): Promise<void>;

  // Equipment operations
  getEquipment(): Promise<Equipment[]>;
  getEquipmentItem(id: string): Promise<Equipment | undefined>;
  getEquipmentByProperty(propertyId: string): Promise<Equipment[]>;
  getEquipmentBySpace(spaceId: string): Promise<Equipment[]>;
  getEquipmentByPropertyAndSpace(propertyId: string, spaceId: string): Promise<Equipment[]>;
  getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;

  // Lockbox operations
  getLockboxes(): Promise<Lockbox[]>;
  getLockbox(id: string): Promise<Lockbox | undefined>;
  createLockbox(lockbox: InsertLockbox): Promise<Lockbox>;
  updateLockbox(id: string, data: Partial<InsertLockbox>): Promise<Lockbox | undefined>;
  deleteLockbox(id: string): Promise<void>;

  // Lockbox code operations
  getLockboxCodes(lockboxId: string): Promise<LockboxCode[]>;
  getLockboxCode(id: string): Promise<LockboxCode | undefined>;
  createLockboxCode(code: InsertLockboxCode): Promise<LockboxCode>;
  updateLockboxCode(id: string, data: Partial<InsertLockboxCode>): Promise<LockboxCode | undefined>;
  deleteLockboxCode(id: string): Promise<void>;
  assignRandomCode(lockboxId: string): Promise<LockboxCode | null>;

  // Vehicle operations
  getVehicles(filters?: { status?: string }): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByVehicleId(vehicleId: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  updateVehicleStatus(id: string, status: string): Promise<Vehicle | undefined>;
  updateVehicleMileage(id: string, mileage: number): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<void>;

  // Vehicle reservation operations
  getVehicleReservations(filters?: {
    vehicleId?: string;
    userId?: string;
    status?: string;
  }): Promise<VehicleReservation[]>;
  getVehicleReservation(id: string): Promise<VehicleReservation | undefined>;
  createVehicleReservation(reservation: InsertVehicleReservation): Promise<VehicleReservation>;
  updateVehicleReservation(id: string, data: Partial<InsertVehicleReservation>): Promise<VehicleReservation | undefined>;
  updateReservationStatus(id: string, status: string): Promise<VehicleReservation | undefined>;
  deleteVehicleReservation(id: string): Promise<void>;
  checkVehicleAvailability(vehicleId: string, startDate: Date, endDate: Date, excludeReservationId?: string): Promise<boolean>;

  // Vehicle check-out log operations
  getVehicleCheckOutLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckOutLog[]>;
  getVehicleCheckOutLog(id: string): Promise<VehicleCheckOutLog | undefined>;
  getCheckOutLogByReservation(reservationId: string): Promise<VehicleCheckOutLog | undefined>;
  createVehicleCheckOutLog(log: InsertVehicleCheckOutLog): Promise<VehicleCheckOutLog>;
  deleteVehicleCheckOutLog(id: string): Promise<void>;

  // Vehicle check-in log operations
  getVehicleCheckInLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckInLog[]>;
  getVehicleCheckInLog(id: string): Promise<VehicleCheckInLog | undefined>;
  getCheckInLogByCheckOut(checkOutLogId: string): Promise<VehicleCheckInLog | undefined>;
  createVehicleCheckInLog(log: InsertVehicleCheckInLog): Promise<VehicleCheckInLog>;
  updateVehicleCheckInLog(id: string, data: Partial<InsertVehicleCheckInLog>): Promise<VehicleCheckInLog | undefined>;
  deleteVehicleCheckInLog(id: string): Promise<void>;

  // Vehicle maintenance schedule operations
  getVehicleMaintenanceSchedules(vehicleId?: string): Promise<VehicleMaintenanceSchedule[]>;
  getVehicleMaintenanceSchedule(id: string): Promise<VehicleMaintenanceSchedule | undefined>;
  createVehicleMaintenanceSchedule(schedule: InsertVehicleMaintenanceSchedule): Promise<VehicleMaintenanceSchedule>;
  updateVehicleMaintenanceSchedule(id: string, data: Partial<InsertVehicleMaintenanceSchedule>): Promise<VehicleMaintenanceSchedule | undefined>;
  deleteVehicleMaintenanceSchedule(id: string): Promise<void>;

  // Vehicle maintenance log operations
  getVehicleMaintenanceLogs(vehicleId: string): Promise<VehicleMaintenanceLog[]>;
  getVehicleMaintenanceLogByTaskId(taskId: string): Promise<VehicleMaintenanceLog | undefined>;
  createVehicleMaintenanceLog(log: InsertVehicleMaintenanceLog): Promise<VehicleMaintenanceLog>;
  deleteVehicleMaintenanceLog(id: string): Promise<void>;

  // Vehicle document operations
  getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]>;
  getVehicleDocument(id: string): Promise<VehicleDocument | undefined>;
  createVehicleDocument(document: InsertVehicleDocument): Promise<VehicleDocument>;
  updateVehicleDocument(id: string, data: Partial<InsertVehicleDocument>): Promise<VehicleDocument | undefined>;
  deleteVehicleDocument(id: string): Promise<void>;
  getExpiringDocuments(daysAhead: number): Promise<(VehicleDocument & { vehicle: { id: string; vehicleId: string; make: string; model: string } })[]>;
  markDocumentReminderSent(id: string): Promise<VehicleDocument | undefined>;

  // Checklist template operations
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: string, data: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined>;
  deleteChecklistTemplate(id: string): Promise<void>;

  // Emergency contact operations
  getEmergencyContacts(): Promise<EmergencyContact[]>;
  getActiveEmergencyContact(): Promise<EmergencyContact | undefined>;
  getEmergencyContact(id: string): Promise<EmergencyContact | undefined>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: string, data: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: string): Promise<void>;
  setActiveEmergencyContact(id: string): Promise<EmergencyContact | undefined>;
  clearActiveEmergencyContact(): Promise<void>;

  // Notification operations
  getNotifications(userId?: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId?: string): Promise<number>;
  hasNotificationForRelatedItem(relatedId: string, type: string): Promise<boolean>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId?: string): Promise<void>;
  dismissNotification(id: string): Promise<void>;
  dismissAllNotifications(userId?: string): Promise<void>;

  // Project operations
  getProjects(filters?: { status?: string; createdById?: string }): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  getTasksByProject(projectId: string): Promise<Task[]>;

  // Project team member operations
  getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]>;
  addProjectTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember>;
  removeProjectTeamMember(id: string): Promise<void>;
  updateProjectTeamMember(id: string, data: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined>;

  // Project vendor operations
  getProjectVendors(projectId: string): Promise<ProjectVendor[]>;
  addProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor>;
  removeProjectVendor(id: string): Promise<void>;
  updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined>;

  // Quote operations
  getQuotes(filters?: { taskId?: string; status?: string }): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByTaskId(taskId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;

  // Quote attachment operations
  getQuoteAttachment(id: string): Promise<QuoteAttachment | undefined>;
  getQuoteAttachments(quoteId: string): Promise<QuoteAttachment[]>;
  createQuoteAttachment(attachment: InsertQuoteAttachment): Promise<QuoteAttachment>;
  deleteQuoteAttachment(id: string): Promise<void>;

  // Email template operations
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByTrigger(trigger: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: { subject?: string; body?: string; name?: string }): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Email log operations
  getEmailLogs(filters?: { templateType?: string; status?: string; search?: string }): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  // Notification settings operations
  getNotificationSettings(): Promise<NotificationSetting[]>;
  getNotificationSetting(type: string): Promise<NotificationSetting | undefined>;
  upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting>;
  updateNotificationSetting(id: string, data: { emailEnabled?: boolean; inAppEnabled?: boolean }): Promise<NotificationSetting | undefined>;

  // Availability schedule operations
  getUserAvailability(userId: string): Promise<AvailabilitySchedule[]>;
  upsertUserAvailability(userId: string, schedules: InsertAvailabilitySchedule[]): Promise<AvailabilitySchedule[]>;

  // User skills operations
  getUserSkills(userId: string): Promise<UserSkill[]>;
  createUserSkill(skill: InsertUserSkill): Promise<UserSkill>;
  deleteUserSkill(id: string): Promise<void>;
  getAllUserSkills(): Promise<UserSkill[]>;

  // Task dependency operations
  getTaskDependencies(taskId: string): Promise<TaskDependency[]>;
  createTaskDependency(dep: InsertTaskDependency): Promise<TaskDependency>;
  deleteTaskDependency(id: string): Promise<void>;

  // SLA config operations
  getSlaConfigs(): Promise<SlaConfig[]>;
  upsertSlaConfig(urgencyLevel: string, data: { responseHours: number; resolutionHours: number }): Promise<SlaConfig>;

  // AI agent log operations
  createAiAgentLog(log: InsertAiAgentLog): Promise<AiAgentLog>;
  getAiAgentLogs(filters?: { status?: string; entityType?: string; limit?: number }): Promise<AiAgentLog[]>;
  updateAiAgentLog(id: string, data: { status: string; reviewedBy?: string }): Promise<AiAgentLog | undefined>;

  // Password reset token operations
  createResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getResetTokenByToken(token: string): Promise<import("@shared/schema").PasswordResetToken | undefined>;
  markResetTokenUsed(token: string): Promise<void>;

  // Resource Library operations
  getResourceCategories(): Promise<ResourceCategory[]>;
  createResourceCategory(data: InsertResourceCategory): Promise<ResourceCategory>;
  getResourceFolders(parentId?: string | null): Promise<ResourceFolder[]>;
  getAllResourceFolders(): Promise<ResourceFolder[]>;
  getResourceFolderById(id: string): Promise<(ResourceFolder & { breadcrumbs: { id: string; name: string }[] }) | undefined>;
  createResourceFolder(data: InsertResourceFolder): Promise<ResourceFolder>;
  updateResourceFolder(id: string, data: Partial<InsertResourceFolder>): Promise<ResourceFolder | undefined>;
  deleteResourceFolder(id: string): Promise<void>;
  getResources(filters?: { categoryId?: string; type?: string; folderId?: string | null }): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]>;
  getResourceById(id: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] }) | undefined>;
  createResource(data: InsertResource, propertyIds: string[]): Promise<Resource>;
  updateResource(id: string, data: Partial<InsertResource>, propertyIds: string[]): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<void>;
  getPropertyResources(propertyId: string): Promise<(Resource & { category: ResourceCategory | null })[]>;
  getEquipmentResources(equipmentId: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]>;
}

export class DatabaseStorage implements IStorage {
  private db = db; // Ensure db instance is available within the class

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
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
    const [user] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await this.db
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
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    return await this.db.select().from(users).where(
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
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }


  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return await this.db.select().from(vendors);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await this.db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const [vendor] = await this.db.insert(vendors).values(vendorData).returning();
    return vendor;
  }

  async updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await this.db
      .update(vendors)
      .set({ ...vendorData, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: string): Promise<void> {
    await this.db.delete(vendors).where(eq(vendors.id, id));
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await this.db.select().from(inventoryItems);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await this.db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await this.db.insert(inventoryItems).values(itemData).returning();
    return item;
  }

  async updateInventoryItem(id: string, itemData: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [item] = await this.db
      .update(inventoryItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async updateInventoryQuantity(id: string, quantityChange: number): Promise<InventoryItem | undefined> {
    const [item] = await this.db
      .update(inventoryItems)
      .set({ 
        quantity: sql`${inventoryItems.quantity} + ${quantityChange}`,
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async getInventoryItemByBarcode(barcode: string): Promise<InventoryItem | undefined> {
    const [item] = await this.db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.barcode, barcode));
    return item;
  }

  async updateInventoryStatus(id: string, stockStatus: string): Promise<InventoryItem | undefined> {
    const [item] = await this.db
      .update(inventoryItems)
      .set({ stockStatus, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async useOneContainer(id: string): Promise<InventoryItem | undefined> {
    const current = await this.getInventoryItem(id);
    if (!current) return undefined;
    const currentQty = parseFloat(current.quantity as unknown as string) || 0;
    const newQty = Math.max(0, currentQty - 1);
    const [item] = await this.db
      .update(inventoryItems)
      .set({ 
        quantity: String(newQty),
        updatedAt: new Date()
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  // Area operations
  async getAreas(): Promise<Area[]> {
    return await this.db.select().from(areas);
  }

  async createArea(areaData: InsertArea): Promise<Area> {
    const [area] = await this.db.insert(areas).values(areaData).returning();
    return area;
  }

  async deleteArea(id: string): Promise<void> {
    await this.db.delete(areas).where(eq(areas.id, id));
  }

  // Subdivision operations
  async getSubdivisionsByArea(areaId: string): Promise<Subdivision[]> {
    return await this.db
      .select()
      .from(subdivisions)
      .where(eq(subdivisions.areaId, areaId));
  }

  async createSubdivision(
    subdivisionData: InsertSubdivision
  ): Promise<Subdivision> {
    const [subdivision] = await this.db
      .insert(subdivisions)
      .values(subdivisionData)
      .returning();
    return subdivision;
  }

  async deleteSubdivision(id: string): Promise<void> {
    await this.db.delete(subdivisions).where(eq(subdivisions.id, id));
  }

  // Service request operations
  async getServiceRequests(filters?: {
    userId?: string;
    status?: string;
  }): Promise<ServiceRequest[]> {
    let query = this.db.select().from(serviceRequests);

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

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id));
    return request;
  }

  async createServiceRequest(
    requestData: InsertServiceRequest
  ): Promise<ServiceRequest> {
    const [request] = await this.db
      .insert(serviceRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateServiceRequest(id: string, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    const [request] = await this.db
      .update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }

  async deleteServiceRequest(id: string): Promise<void> {
    await this.db.delete(serviceRequests).where(eq(serviceRequests.id, id));
  }

  async updateServiceRequestStatus(
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<ServiceRequest | undefined> {
    const [request] = await this.db
      .update(serviceRequests)
      .set({ status: status as any, rejectionReason, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request;
  }

  // Task operations
  async getTasks(filters?: {
    assignedToId?: string;
    assignedVendorId?: string;
    status?: string;
    areaId?: string;
    executorType?: string;
    assignedToIdOrPool?: { userId: string; pool: string };
    equipmentId?: string;
  }): Promise<Task[]> {
    let query = this.db.select({
        id: tasks.id,
        requestId: tasks.requestId,
        propertyId: tasks.propertyId,
        spaceId: tasks.spaceId,
        equipmentId: tasks.equipmentId,
        vehicleId: tasks.vehicleId,
        name: tasks.name,
        description: tasks.description,
        urgency: tasks.urgency,
        areaId: tasks.areaId,
        subdivisionId: tasks.subdivisionId,
        initialDate: tasks.initialDate,
        estimatedCompletionDate: tasks.estimatedCompletionDate,
        actualCompletionDate: tasks.actualCompletionDate,
        assignedToId: tasks.assignedToId,
        assignedVendorId: tasks.assignedVendorId,
        taskType: tasks.taskType,
        executorType: tasks.executorType,
        assignedPool: tasks.assignedPool,
        status: tasks.status,
        onHoldReason: tasks.onHoldReason,
        recurringFrequency: tasks.recurringFrequency,
        recurringInterval: tasks.recurringInterval,
        recurringEndDate: tasks.recurringEndDate,
        contactType: tasks.contactType,
        contactStaffId: tasks.contactStaffId,
        contactName: tasks.contactName,
        contactEmail: tasks.contactEmail,
        contactPhone: tasks.contactPhone,
        instructions: tasks.instructions,
        requiresPhoto: tasks.requiresPhoto,
        requiresEstimate: tasks.requiresEstimate,
        estimateStatus: tasks.estimateStatus,
        approvedQuoteId: tasks.approvedQuoteId,
        createdById: tasks.createdById,
        projectId: tasks.projectId,
        estimatedHours: tasks.estimatedHours,
        scheduledStartTime: tasks.scheduledStartTime,
        requiredSkill: tasks.requiredSkill,
        aiGenerated: tasks.aiGenerated,
        parentTaskId: tasks.parentTaskId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(serviceRequests, eq(tasks.requestId, serviceRequests.id))
      .leftJoin(users, eq(tasks.assignedToId, users.id))
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
    if (filters?.executorType) {
      conditions.push(eq(tasks.executorType, filters.executorType as any));
    }
    if (filters?.equipmentId) {
      conditions.push(eq(tasks.equipmentId, filters.equipmentId));
    }
    // Filter by assigned user OR assigned pool (for students/technicians)
    if (filters?.assignedToIdOrPool) {
      const { userId, pool } = filters.assignedToIdOrPool;
      conditions.push(
        or(
          eq(tasks.assignedToId, userId),
          eq(tasks.assignedPool, pool)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(tasks.initialDate));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await this.db
      .insert(tasks)
      .values(taskData)
      .returning();
    return task;
  }

  async createTaskWithChecklists(
    taskData: InsertTask,
    checklistData: Omit<InsertTaskChecklist, 'taskId'>[]
  ): Promise<{ task: Task; checklists: TaskChecklist[] }> {
    // Use transaction to ensure atomicity
    return await this.db.transaction(async (tx) => {
      // Create task first
      const [task] = await tx
        .insert(tasks)
        .values(taskData)
        .returning();

      // Create checklists if any
      let createdChecklists: TaskChecklist[] = [];
      if (checklistData.length > 0) {
        const checklistItems = checklistData.map((item, index) => ({
          taskId: task.id,
          text: item.text,
          isCompleted: item.isCompleted || false,
          sortOrder: item.sortOrder ?? index,
        }));
        createdChecklists = await tx
          .insert(taskChecklists)
          .values(checklistItems)
          .returning();
      }

      return { task, checklists: createdChecklists };
    });
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await this.db.delete(tasks).where(eq(tasks.id, id));
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

    const [task] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getSubTasks(parentTaskId: string): Promise<Task[]> {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));
  }

  // Time entry operations
  async createTimeEntry(entryData: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await this.db.insert(timeEntries).values(entryData).returning();
    return entry;
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await this.db
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
    const [entry] = await this.db
      .update(timeEntries)
      .set({ endTime, durationMinutes })
      .where(eq(timeEntries.id, id))
      .returning();
    return entry;
  }

  async getTimeEntriesByTask(taskId: string): Promise<TimeEntry[]> {
    return await this.db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId));
  }

  // Parts used operations
  async createPartUsed(partData: InsertPartUsed): Promise<PartUsed> {
    // Database trigger automatically updates inventory quantities
    const [part] = await this.db.insert(partsUsed).values(partData).returning();
    return part;
  }

  async deletePartUsed(id: string): Promise<void> {
    // Database trigger will automatically restore inventory quantity
    await this.db.delete(partsUsed).where(eq(partsUsed.id, id));
  }

  async getPartsByTask(taskId: string): Promise<PartUsed[]> {
    return await this.db
      .select()
      .from(partsUsed)
      .where(eq(partsUsed.taskId, taskId));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await this.db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessagesByRequest(requestId: string): Promise<Message[]> {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.requestId, requestId))
      .orderBy(messages.createdAt);
  }

  async getMessagesByTask(taskId: string): Promise<Message[]> {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.createdAt);
  }

  async getMessages(): Promise<Message[]> {
    return await this.db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.id, id));
  }

  async markMessagesAsRead(requestId: string, userId: string): Promise<void> {
    await this.db
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
    await this.db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.taskId, taskId),
          ne(messages.senderId, userId)
        )
      );
  }

  // Task note operations
  async createTaskNote(noteData: InsertTaskNote): Promise<TaskNote> {
    const [note] = await this.db.insert(taskNotes).values(noteData).returning();
    return note;
  }

  async getTaskNote(id: string): Promise<TaskNote | undefined> {
    const [note] = await this.db.select().from(taskNotes).where(eq(taskNotes.id, id));
    return note;
  }

  async getNotesByTask(taskId: string): Promise<TaskNote[]> {
    return await this.db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(taskNotes.createdAt);
  }

  async deleteTaskNote(id: string): Promise<void> {
    await this.db.delete(taskNotes).where(eq(taskNotes.id, id));
  }

  // Task checklist operations
  async getChecklistsByTask(taskId: string): Promise<TaskChecklist[]> {
    return await this.db
      .select()
      .from(taskChecklists)
      .where(eq(taskChecklists.taskId, taskId))
      .orderBy(taskChecklists.sortOrder);
  }

  async getTaskChecklist(id: string): Promise<TaskChecklist | undefined> {
    const [checklist] = await this.db.select().from(taskChecklists).where(eq(taskChecklists.id, id));
    return checklist;
  }

  async createTaskChecklist(checklist: InsertTaskChecklist): Promise<TaskChecklist> {
    const [result] = await this.db.insert(taskChecklists).values(checklist).returning();
    return result;
  }

  async updateTaskChecklist(id: string, data: Partial<InsertTaskChecklist>): Promise<TaskChecklist | undefined> {
    const [result] = await this.db
      .update(taskChecklists)
      .set(data)
      .where(eq(taskChecklists.id, id))
      .returning();
    return result;
  }

  async deleteTaskChecklist(id: string): Promise<void> {
    await this.db.delete(taskChecklists).where(eq(taskChecklists.id, id));
  }

  async createTaskChecklists(checklists: InsertTaskChecklist[]): Promise<TaskChecklist[]> {
    if (checklists.length === 0) return [];
    return await this.db.insert(taskChecklists).values(checklists).returning();
  }

  // Task checklist group/item operations (named checklists)
  async getChecklistGroupsByTask(taskId: string): Promise<(TaskChecklistGroup & { items: TaskChecklistItem[] })[]> {
    const groups = await this.db
      .select()
      .from(taskChecklistGroups)
      .where(eq(taskChecklistGroups.taskId, taskId))
      .orderBy(taskChecklistGroups.sortOrder);
    
    const result = await Promise.all(
      groups.map(async (group) => {
        const items = await this.db
          .select()
          .from(taskChecklistItems)
          .where(eq(taskChecklistItems.groupId, group.id))
          .orderBy(taskChecklistItems.sortOrder);
        return { ...group, items };
      })
    );
    
    return result;
  }

  async getChecklistGroup(id: string): Promise<TaskChecklistGroup | undefined> {
    const [group] = await this.db.select().from(taskChecklistGroups).where(eq(taskChecklistGroups.id, id));
    return group;
  }

  async createChecklistGroup(group: InsertTaskChecklistGroup): Promise<TaskChecklistGroup> {
    const [result] = await this.db.insert(taskChecklistGroups).values(group).returning();
    return result;
  }

  async updateChecklistGroup(id: string, data: Partial<InsertTaskChecklistGroup>): Promise<TaskChecklistGroup | undefined> {
    const [result] = await this.db
      .update(taskChecklistGroups)
      .set(data)
      .where(eq(taskChecklistGroups.id, id))
      .returning();
    return result;
  }

  async deleteChecklistGroup(id: string): Promise<void> {
    await this.db.delete(taskChecklistGroups).where(eq(taskChecklistGroups.id, id));
  }

  async getChecklistItem(id: string): Promise<TaskChecklistItem | undefined> {
    const [item] = await this.db.select().from(taskChecklistItems).where(eq(taskChecklistItems.id, id));
    return item;
  }

  async createChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem> {
    const [result] = await this.db.insert(taskChecklistItems).values(item).returning();
    return result;
  }

  async updateChecklistItem(id: string, data: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem | undefined> {
    const [result] = await this.db
      .update(taskChecklistItems)
      .set(data)
      .where(eq(taskChecklistItems.id, id))
      .returning();
    return result;
  }

  async deleteChecklistItem(id: string): Promise<void> {
    await this.db.delete(taskChecklistItems).where(eq(taskChecklistItems.id, id));
  }

  async createTaskWithChecklistGroups(
    taskData: InsertTask,
    groups: { name: string; sortOrder?: number; items: { text: string; isCompleted?: boolean; sortOrder?: number }[] }[]
  ): Promise<{ task: Task; groups: (TaskChecklistGroup & { items: TaskChecklistItem[] })[] }> {
    return await this.db.transaction(async (tx) => {
      // Create task first
      const [task] = await tx.insert(tasks).values(taskData).returning();

      // Create groups and items
      const createdGroups: (TaskChecklistGroup & { items: TaskChecklistItem[] })[] = [];
      
      for (let i = 0; i < groups.length; i++) {
        const groupData = groups[i];
        const [group] = await tx
          .insert(taskChecklistGroups)
          .values({
            taskId: task.id,
            name: groupData.name,
            sortOrder: groupData.sortOrder ?? i,
          })
          .returning();

        const createdItems: TaskChecklistItem[] = [];
        if (groupData.items.length > 0) {
          const itemsData = groupData.items.map((item, idx) => ({
            groupId: group.id,
            text: item.text,
            isCompleted: item.isCompleted || false,
            sortOrder: item.sortOrder ?? idx,
          }));
          const items = await tx.insert(taskChecklistItems).values(itemsData).returning();
          createdItems.push(...items);
        }

        createdGroups.push({ ...group, items: createdItems });
      }

      return { task, groups: createdGroups };
    });
  }

  // Upload operations
  async createUpload(uploadData: InsertUpload): Promise<Upload> {
    console.log("DB: Inserting upload data:", JSON.stringify(uploadData, null, 2));
    const [upload] = await this.db.insert(uploads).values(uploadData).returning();
    return upload;
  }

  async getUploadsByRequest(requestId: string): Promise<Upload[]> {
    return await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.requestId, requestId))
      .orderBy(uploads.createdAt);
  }

  async getUploadsByTask(taskId: string): Promise<Upload[]> {
    return await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.taskId, taskId))
      .orderBy(uploads.createdAt);
  }

  async getUploadsByEquipment(equipmentId: string): Promise<Upload[]> {
    return await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.equipmentId, equipmentId))
      .orderBy(uploads.createdAt);
  }

  async getUploadsByVehicleCheckOutLog(checkOutLogId: string): Promise<Upload[]> {
    console.log("Fetching uploads for checkout log:", checkOutLogId);
    const results = await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.vehicleCheckOutLogId, checkOutLogId))
      .orderBy(uploads.createdAt);
    console.log("Found uploads:", results.length);
    return results;
  }

  async getUploadsByVehicleCheckInLog(checkInLogId: string): Promise<Upload[]> {
    return await this.db
      .select()
      .from(uploads)
      .where(eq(uploads.vehicleCheckInLogId, checkInLogId))
      .orderBy(uploads.createdAt);
  }

  async getUpload(id: string): Promise<Upload | undefined> {
    const [upload] = await this.db.select().from(uploads).where(eq(uploads.id, id));
    return upload;
  }

  async deleteUpload(id: string): Promise<void> {
    await this.db.delete(uploads).where(eq(uploads.id, id));
  }

  // Property operations
  async getProperties(): Promise<Property[]> {
    return await this.db.select().from(properties);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await this.db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const [property] = await this.db.insert(properties).values(propertyData).returning();
    return property;
  }

  async updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await this.db
      .update(properties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    await this.db.delete(properties).where(eq(properties.id, id));
  }

  async getTasksByProperty(propertyId: string): Promise<Task[]> {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.propertyId, propertyId))
      .orderBy(desc(tasks.initialDate));
  }

  // Space operations (rooms within buildings)
  async getSpaces(): Promise<Space[]> {
    return await this.db.select().from(spaces).orderBy(spaces.name);
  }

  async getSpace(id: string): Promise<Space | undefined> {
    const [space] = await this.db.select().from(spaces).where(eq(spaces.id, id));
    return space;
  }

  async getSpacesByProperty(propertyId: string): Promise<Space[]> {
    return await this.db
      .select()
      .from(spaces)
      .where(eq(spaces.propertyId, propertyId))
      .orderBy(spaces.floor, spaces.name);
  }

  async createSpace(spaceData: InsertSpace): Promise<Space> {
    const [space] = await this.db.insert(spaces).values(spaceData).returning();
    return space;
  }

  async updateSpace(id: string, data: Partial<InsertSpace>): Promise<Space | undefined> {
    const [space] = await this.db
      .update(spaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(spaces.id, id))
      .returning();
    return space;
  }

  async deleteSpace(id: string): Promise<void> {
    await this.db.delete(spaces).where(eq(spaces.id, id));
  }

  // Equipment operations
  async getEquipment(): Promise<Equipment[]> {
    return await this.db.select().from(equipment).orderBy(equipment.name);
  }

  async getEquipmentItem(id: string): Promise<Equipment | undefined> {
    const [item] = await this.db.select().from(equipment).where(eq(equipment.id, id));
    return item;
  }

  async getEquipmentByProperty(propertyId: string): Promise<Equipment[]> {
    return await this.db
      .select()
      .from(equipment)
      .where(eq(equipment.propertyId, propertyId))
      .orderBy(equipment.category, equipment.name);
  }

  async getEquipmentBySpace(spaceId: string): Promise<Equipment[]> {
    return await this.db
      .select()
      .from(equipment)
      .where(eq(equipment.spaceId, spaceId))
      .orderBy(equipment.category, equipment.name);
  }

  async getEquipmentByPropertyAndSpace(propertyId: string, spaceId: string): Promise<Equipment[]> {
    return await this.db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.propertyId, propertyId),
          or(isNull(equipment.spaceId), eq(equipment.spaceId, spaceId))
        )
      )
      .orderBy(equipment.category, equipment.name);
  }

  async getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]> {
    return await this.db
      .select()
      .from(equipment)
      .where(and(eq(equipment.propertyId, propertyId), eq(equipment.category, category as any)))
      .orderBy(equipment.name);
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [item] = await this.db.insert(equipment).values(equipmentData).returning();
    return item;
  }

  async updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [item] = await this.db
      .update(equipment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();
    return item;
  }

  async deleteEquipment(id: string): Promise<void> {
    await this.db.delete(equipment).where(eq(equipment.id, id));
  }

  // Lockbox operations
  async getLockboxes(): Promise<Lockbox[]> {
    return await this.db.select().from(lockboxes).orderBy(lockboxes.name);
  }

  async getLockbox(id: string): Promise<Lockbox | undefined> {
    const [lockbox] = await this.db.select().from(lockboxes).where(eq(lockboxes.id, id));
    return lockbox;
  }

  async createLockbox(lockbox: InsertLockbox): Promise<Lockbox> {
    const [created] = await this.db.insert(lockboxes).values(lockbox).returning();
    return created;
  }

  async updateLockbox(id: string, data: Partial<InsertLockbox>): Promise<Lockbox | undefined> {
    const [updated] = await this.db.update(lockboxes).set(data).where(eq(lockboxes.id, id)).returning();
    return updated;
  }

  async deleteLockbox(id: string): Promise<void> {
    await this.db.delete(lockboxes).where(eq(lockboxes.id, id));
  }

  // Lockbox code operations
  async getLockboxCodes(lockboxId: string): Promise<LockboxCode[]> {
    return await this.db.select().from(lockboxCodes).where(eq(lockboxCodes.lockboxId, lockboxId)).orderBy(lockboxCodes.createdAt);
  }

  async getLockboxCode(id: string): Promise<LockboxCode | undefined> {
    const [code] = await this.db.select().from(lockboxCodes).where(eq(lockboxCodes.id, id));
    return code;
  }

  async createLockboxCode(code: InsertLockboxCode): Promise<LockboxCode> {
    const [created] = await this.db.insert(lockboxCodes).values(code).returning();
    return created;
  }

  async updateLockboxCode(id: string, data: Partial<InsertLockboxCode>): Promise<LockboxCode | undefined> {
    const [updated] = await this.db.update(lockboxCodes).set(data).where(eq(lockboxCodes.id, id)).returning();
    return updated;
  }

  async deleteLockboxCode(id: string): Promise<void> {
    await this.db.delete(lockboxCodes).where(eq(lockboxCodes.id, id));
  }

  async assignRandomCode(lockboxId: string): Promise<LockboxCode | null> {
    const activeCodes = await this.db.select().from(lockboxCodes)
      .where(and(eq(lockboxCodes.lockboxId, lockboxId), eq(lockboxCodes.status, "active")));

    if (activeCodes.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * activeCodes.length);
    const selected = activeCodes[randomIndex];

    const [updated] = await this.db.update(lockboxCodes)
      .set({
        lastUsedAt: new Date(),
        useCount: sql`${lockboxCodes.useCount} + 1`,
      })
      .where(eq(lockboxCodes.id, selected.id))
      .returning();

    return updated;
  }

  // Vehicle operations
  async getVehicles(filters?: { status?: string }): Promise<Vehicle[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(vehicles.status, filters.status as any));
    }

    const query = this.db.select().from(vehicles);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(vehicles.vehicleId);
    }
    return await query.orderBy(vehicles.vehicleId);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getVehicleByVehicleId(vehicleId: string): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.vehicleId, vehicleId));
    return vehicle;
  }

  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await this.db.insert(vehicles).values(vehicleData).returning();
    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db
      .update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async updateVehicleStatus(id: string, status: string): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db
      .update(vehicles)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async updateVehicleMileage(id: string, mileage: number): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db
      .update(vehicles)
      .set({ currentMileage: mileage, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Vehicle reservation operations
  async getVehicleReservations(filters?: {
    vehicleId?: string;
    userId?: string;
    status?: string;
  }): Promise<VehicleReservation[]> {
    const conditions = [];
    if (filters?.vehicleId) {
      conditions.push(eq(vehicleReservations.vehicleId, filters.vehicleId));
    }
    if (filters?.userId) {
      conditions.push(eq(vehicleReservations.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(vehicleReservations.status, filters.status as any));
    }

    const query = this.db.select().from(vehicleReservations);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(vehicleReservations.startDate));
    }
    return await query.orderBy(desc(vehicleReservations.startDate));
  }

  async getVehicleReservation(id: string): Promise<VehicleReservation | undefined> {
    const [reservation] = await this.db.select().from(vehicleReservations).where(eq(vehicleReservations.id, id));
    return reservation;
  }

  async createVehicleReservation(reservationData: InsertVehicleReservation): Promise<VehicleReservation> {
    const [reservation] = await this.db.insert(vehicleReservations).values(reservationData).returning();
    return reservation;
  }

  async updateVehicleReservation(
    id: string,
    updates: Partial<InsertVehicleReservation>
  ): Promise<VehicleReservation | undefined> {
    // Ensure date strings are converted to Date objects
    const cleanUpdates: any = { ...updates, updatedAt: new Date() };
    
    if (updates.startDate && typeof updates.startDate === 'string') {
      cleanUpdates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate && typeof updates.endDate === 'string') {
      cleanUpdates.endDate = new Date(updates.endDate);
    }

    const [updated] = await this.db
      .update(vehicleReservations)
      .set(cleanUpdates)
      .where(eq(vehicleReservations.id, id))
      .returning();
    return updated;
  }

  async deleteVehicleReservation(id: string): Promise<void> {
    await this.db
      .delete(vehicleReservations)
      .where(eq(vehicleReservations.id, id));
  }

  async updateReservationStatus(id: string, status: string): Promise<VehicleReservation | undefined> {
    const [reservation] = await this.db
      .update(vehicleReservations)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(vehicleReservations.id, id))
      .returning();
    return reservation;
  }

  async checkVehicleAvailability(
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    excludeReservationId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(vehicleReservations.vehicleId, vehicleId),
      ne(vehicleReservations.status, "cancelled" as any),
      or(
        and(
          sql`${vehicleReservations.startDate} <= ${endDate}`,
          sql`${vehicleReservations.endDate} >= ${startDate}`
        )
      )
    ];

    if (excludeReservationId) {
      conditions.push(ne(vehicleReservations.id, excludeReservationId));
    }

    const conflictingReservations = await this.db
      .select()
      .from(vehicleReservations)
      .where(and(...conditions));

    return conflictingReservations.length === 0;
  }

  // Vehicle check-out log operations
  async getVehicleCheckOutLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckOutLog[]> {
    const conditions = [];
    if (filters?.vehicleId) {
      conditions.push(eq(vehicleCheckOutLogs.vehicleId, filters.vehicleId));
    }
    if (filters?.userId) {
      conditions.push(eq(vehicleCheckOutLogs.userId, filters.userId));
    }

    const query = this.db.select().from(vehicleCheckOutLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(vehicleCheckOutLogs.checkOutTime));
    }
    return await query.orderBy(desc(vehicleCheckOutLogs.checkOutTime));
  }

  async getVehicleCheckOutLog(id: string): Promise<VehicleCheckOutLog | undefined> {
    const [log] = await this.db.select().from(vehicleCheckOutLogs).where(eq(vehicleCheckOutLogs.id, id));
    return log;
  }

  async getCheckOutLogByReservation(reservationId: string): Promise<VehicleCheckOutLog | undefined> {
    const [log] = await this.db
      .select()
      .from(vehicleCheckOutLogs)
      .where(eq(vehicleCheckOutLogs.reservationId, reservationId));
    return log;
  }

  async createVehicleCheckOutLog(logData: InsertVehicleCheckOutLog): Promise<VehicleCheckOutLog> {
    try {
      // Clean the data - remove undefined values and ensure proper types
      const cleanData: any = {
        reservationId: logData.reservationId,
        vehicleId: logData.vehicleId,
        userId: logData.userId,
        startMileage: Number(logData.startMileage),
        fuelLevel: String(logData.fuelLevel),
        cleanlinessConfirmed: Boolean(logData.cleanlinessConfirmed),
      };
      
      // Only include optional fields if they have values
      if (logData.damageNotes !== undefined && logData.damageNotes !== null) {
        cleanData.damageNotes = String(logData.damageNotes);
      }
      if (logData.digitalSignature !== undefined && logData.digitalSignature !== null) {
        cleanData.digitalSignature = String(logData.digitalSignature);
      }
      if (logData.adminOverride !== undefined) {
        cleanData.adminOverride = Boolean(logData.adminOverride);
      }
      
      console.log("Inserting clean data:", JSON.stringify(cleanData, null, 2));
      
      const [log] = await this.db.insert(vehicleCheckOutLogs).values(cleanData).returning();
      if (!log) {
        throw new Error("Failed to create checkout log: No record returned from database");
      }
      return log;
    } catch (error: any) {
      console.error("Database error in createVehicleCheckOutLog:", error);
      console.error("Error code:", error?.code);
      console.error("Error detail:", error?.detail);
      console.error("Error hint:", error?.hint);
      console.error("Log data attempted:", JSON.stringify(logData, null, 2));
      throw error;
    }
  }

  async deleteVehicleCheckOutLog(id: string): Promise<void> {
    await this.db.delete(vehicleCheckOutLogs).where(eq(vehicleCheckOutLogs.id, id));
  }

  // Vehicle check-in log operations
  async getVehicleCheckInLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckInLog[]> {
    const conditions = [];
    if (filters?.vehicleId) {
      conditions.push(eq(vehicleCheckInLogs.vehicleId, filters.vehicleId));
    }
    if (filters?.userId) {
      conditions.push(eq(vehicleCheckInLogs.userId, filters.userId));
    }

    const query = this.db.select().from(vehicleCheckInLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(vehicleCheckInLogs.checkInTime));
    }
    return await query.orderBy(desc(vehicleCheckInLogs.checkInTime));
  }

  async getVehicleCheckInLog(id: string): Promise<VehicleCheckInLog | undefined> {
    const [log] = await this.db.select().from(vehicleCheckInLogs).where(eq(vehicleCheckInLogs.id, id));
    return log;
  }

  async getCheckInLogByCheckOut(checkOutLogId: string): Promise<VehicleCheckInLog | undefined> {
    const [log] = await this.db
      .select()
      .from(vehicleCheckInLogs)
      .where(eq(vehicleCheckInLogs.checkOutLogId, checkOutLogId));
    return log;
  }

  async createVehicleCheckInLog(logData: InsertVehicleCheckInLog): Promise<VehicleCheckInLog> {
    const [log] = await this.db.insert(vehicleCheckInLogs).values(logData).returning();
    return log;
  }

  async updateVehicleCheckInLog(id: string, data: Partial<InsertVehicleCheckInLog>): Promise<VehicleCheckInLog | undefined> {
    const [log] = await this.db
      .update(vehicleCheckInLogs)
      .set(data)
      .where(eq(vehicleCheckInLogs.id, id))
      .returning();
    return log;
  }

  async deleteVehicleCheckInLog(id: string): Promise<void> {
    await this.db.delete(vehicleCheckInLogs).where(eq(vehicleCheckInLogs.id, id));
  }

  // Vehicle maintenance schedule operations
  async getVehicleMaintenanceSchedules(vehicleId?: string): Promise<VehicleMaintenanceSchedule[]> {
    if (vehicleId) {
      return await this.db
        .select()
        .from(vehicleMaintenanceSchedules)
        .where(eq(vehicleMaintenanceSchedules.vehicleId, vehicleId))
        .orderBy(vehicleMaintenanceSchedules.maintenanceType);
    }
    return await this.db.select().from(vehicleMaintenanceSchedules).orderBy(vehicleMaintenanceSchedules.maintenanceType);
  }

  async getVehicleMaintenanceSchedule(id: string): Promise<VehicleMaintenanceSchedule | undefined> {
    const [schedule] = await this.db
      .select()
      .from(vehicleMaintenanceSchedules)
      .where(eq(vehicleMaintenanceSchedules.id, id));
    return schedule;
  }

  async createVehicleMaintenanceSchedule(scheduleData: InsertVehicleMaintenanceSchedule): Promise<VehicleMaintenanceSchedule> {
    const [schedule] = await this.db.insert(vehicleMaintenanceSchedules).values(scheduleData).returning();
    return schedule;
  }

  async updateVehicleMaintenanceSchedule(
    id: string,
    data: Partial<InsertVehicleMaintenanceSchedule>
  ): Promise<VehicleMaintenanceSchedule | undefined> {
    const [schedule] = await this.db
      .update(vehicleMaintenanceSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicleMaintenanceSchedules.id, id))
      .returning();
    return schedule;
  }

  async deleteVehicleMaintenanceSchedule(id: string): Promise<void> {
    await this.db.delete(vehicleMaintenanceSchedules).where(eq(vehicleMaintenanceSchedules.id, id));
  }

  // Vehicle maintenance log operations
  async getVehicleMaintenanceLogs(vehicleId: string): Promise<VehicleMaintenanceLog[]> {
    return await this.db
      .select()
      .from(vehicleMaintenanceLogs)
      .where(eq(vehicleMaintenanceLogs.vehicleId, vehicleId))
      .orderBy(desc(vehicleMaintenanceLogs.maintenanceDate));
  }

  async getVehicleMaintenanceLogByTaskId(taskId: string): Promise<VehicleMaintenanceLog | undefined> {
    const [log] = await this.db
      .select()
      .from(vehicleMaintenanceLogs)
      .where(eq(vehicleMaintenanceLogs.taskId, taskId));
    return log;
  }

  async createVehicleMaintenanceLog(logData: InsertVehicleMaintenanceLog): Promise<VehicleMaintenanceLog> {
    const [log] = await this.db
      .insert(vehicleMaintenanceLogs)
      .values(logData)
      .returning();
    return log;
  }

  async deleteVehicleMaintenanceLog(id: string): Promise<void> {
    await this.db.delete(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id));
  }

  // Vehicle document operations
  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    return await this.db
      .select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.vehicleId, vehicleId))
      .orderBy(vehicleDocuments.expirationDate);
  }

  async getVehicleDocument(id: string): Promise<VehicleDocument | undefined> {
    const [document] = await this.db
      .select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.id, id));
    return document;
  }

  async createVehicleDocument(documentData: InsertVehicleDocument): Promise<VehicleDocument> {
    const [document] = await this.db
      .insert(vehicleDocuments)
      .values(documentData)
      .returning();
    return document;
  }

  async updateVehicleDocument(id: string, data: Partial<InsertVehicleDocument>): Promise<VehicleDocument | undefined> {
    const [document] = await this.db
      .update(vehicleDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicleDocuments.id, id))
      .returning();
    return document;
  }

  async deleteVehicleDocument(id: string): Promise<void> {
    await this.db.delete(vehicleDocuments).where(eq(vehicleDocuments.id, id));
  }

  async getExpiringDocuments(daysAhead: number): Promise<(VehicleDocument & { vehicle: { id: string; vehicleId: string; make: string; model: string } })[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const now = new Date();
    
    const results = await this.db
      .select({
        id: vehicleDocuments.id,
        vehicleId: vehicleDocuments.vehicleId,
        documentType: vehicleDocuments.documentType,
        documentName: vehicleDocuments.documentName,
        expirationDate: vehicleDocuments.expirationDate,
        notes: vehicleDocuments.notes,
        reminderSent: vehicleDocuments.reminderSent,
        reminderSentAt: vehicleDocuments.reminderSentAt,
        createdAt: vehicleDocuments.createdAt,
        updatedAt: vehicleDocuments.updatedAt,
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
          eq(vehicleDocuments.reminderSent, false)
        )
      )
      .orderBy(vehicleDocuments.expirationDate);
    
    return results;
  }

  async markDocumentReminderSent(id: string): Promise<VehicleDocument | undefined> {
    const [document] = await this.db
      .update(vehicleDocuments)
      .set({ reminderSent: true, reminderSentAt: new Date(), updatedAt: new Date() })
      .where(eq(vehicleDocuments.id, id))
      .returning();
    return document;
  }

  // Checklist template operations
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return await this.db
      .select()
      .from(checklistTemplates)
      .orderBy(desc(checklistTemplates.createdAt));
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await this.db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.id, id));
    return template;
  }

  async createChecklistTemplate(templateData: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [template] = await this.db
      .insert(checklistTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateChecklistTemplate(
    id: string,
    data: Partial<InsertChecklistTemplate>
  ): Promise<ChecklistTemplate | undefined> {
    const [template] = await this.db
      .update(checklistTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(checklistTemplates.id, id))
      .returning();
    return template;
  }

  async deleteChecklistTemplate(id: string): Promise<void> {
    await this.db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  }

  // Emergency contact operations
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    return await this.db
      .select()
      .from(emergencyContacts)
      .orderBy(desc(emergencyContacts.createdAt));
  }

  async getActiveEmergencyContact(): Promise<EmergencyContact | undefined> {
    const now = new Date();
    const [contact] = await this.db
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

  async getEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
    const [contact] = await this.db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.id, id));
    return contact;
  }

  async createEmergencyContact(contactData: InsertEmergencyContact): Promise<EmergencyContact> {
    // If this contact is set as active, deactivate all others first
    if (contactData.isActive) {
      await this.db
        .update(emergencyContacts)
        .set({ isActive: false, updatedAt: new Date() });
    }
    
    const [contact] = await this.db
      .insert(emergencyContacts)
      .values(contactData)
      .returning();
    return contact;
  }

  async updateEmergencyContact(
    id: string,
    data: Partial<InsertEmergencyContact>
  ): Promise<EmergencyContact | undefined> {
    // If setting this contact as active, deactivate all others first
    if (data.isActive) {
      await this.db
        .update(emergencyContacts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(ne(emergencyContacts.id, id));
    }

    const [contact] = await this.db
      .update(emergencyContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emergencyContacts.id, id))
      .returning();
    return contact;
  }

  async deleteEmergencyContact(id: string): Promise<void> {
    await this.db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  }

  async setActiveEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
    // Deactivate all contacts first
    await this.db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() });
    
    // Then activate the specified contact
    const [contact] = await this.db
      .update(emergencyContacts)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(emergencyContacts.id, id))
      .returning();
    return contact;
  }

  async clearActiveEmergencyContact(): Promise<void> {
    await this.db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() });
  }

  // Notification operations
  async getNotifications(userId?: string): Promise<Notification[]> {
    if (userId) {
      return await this.db
        .select()
        .from(notifications)
        .where(
          and(
            or(eq(notifications.userId, userId), isNull(notifications.userId)),
            eq(notifications.isDismissed, false)
          )
        )
        .orderBy(desc(notifications.createdAt));
    }
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.isDismissed, false))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId?: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          userId ? or(eq(notifications.userId, userId), isNull(notifications.userId)) : sql`true`,
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      );
    return result[0]?.count || 0;
  }

  async hasNotificationForRelatedItem(relatedId: string, type: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.relatedId, relatedId),
          eq(notifications.type, type as any),
          eq(notifications.isDismissed, false)
        )
      );
    return (result[0]?.count || 0) > 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await this.db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId?: string): Promise<void> {
    if (userId) {
      await this.db
        .update(notifications)
        .set({ isRead: true })
        .where(
          or(eq(notifications.userId, userId), isNull(notifications.userId))
        );
    } else {
      await this.db.update(notifications).set({ isRead: true });
    }
  }

  async dismissNotification(id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isDismissed: true })
      .where(eq(notifications.id, id));
  }

  async dismissAllNotifications(userId?: string): Promise<void> {
    if (userId) {
      await this.db
        .update(notifications)
        .set({ isDismissed: true })
        .where(
          or(eq(notifications.userId, userId), isNull(notifications.userId))
        );
    } else {
      await this.db.update(notifications).set({ isDismissed: true });
    }
  }

  // Project operations
  async getProjects(filters?: { status?: string; createdById?: string }): Promise<Project[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status as any));
    }
    if (filters?.createdById) {
      conditions.push(eq(projects.createdById, filters.createdById));
    }

    const query = this.db.select().from(projects);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(projects.createdAt));
    }
    return await query.orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await this.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.initialDate));
  }

  // Project team member operations
  async getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    return await this.db
      .select()
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, projectId));
  }

  async addProjectTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember> {
    const [result] = await this.db.insert(projectTeamMembers).values(member).returning();
    return result;
  }

  async removeProjectTeamMember(id: string): Promise<void> {
    await this.db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, id));
  }

  async updateProjectTeamMember(id: string, data: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined> {
    const [result] = await this.db
      .update(projectTeamMembers)
      .set(data)
      .where(eq(projectTeamMembers.id, id))
      .returning();
    return result;
  }

  // Project vendor operations
  async getProjectVendors(projectId: string): Promise<ProjectVendor[]> {
    return await this.db
      .select()
      .from(projectVendors)
      .where(eq(projectVendors.projectId, projectId));
  }

  async addProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor> {
    const [result] = await this.db.insert(projectVendors).values(vendor).returning();
    return result;
  }

  async removeProjectVendor(id: string): Promise<void> {
    await this.db.delete(projectVendors).where(eq(projectVendors.id, id));
  }

  async updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined> {
    const [result] = await this.db
      .update(projectVendors)
      .set(data)
      .where(eq(projectVendors.id, id))
      .returning();
    return result;
  }

  // Quote operations
  async getQuotes(filters?: { taskId?: string; status?: string }): Promise<Quote[]> {
    const conditions = [];
    if (filters?.taskId) {
      conditions.push(eq(quotes.taskId, filters.taskId));
    }
    if (filters?.status) {
      conditions.push(eq(quotes.status, filters.status as any));
    }

    const query = this.db.select().from(quotes);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(quotes.createdAt));
    }
    return await query.orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuotesByTaskId(taskId: string): Promise<Quote[]> {
    return await this.db
      .select()
      .from(quotes)
      .where(eq(quotes.taskId, taskId))
      .orderBy(desc(quotes.createdAt));
  }

  async createQuote(quoteData: InsertQuote): Promise<Quote> {
    const [quote] = await this.db.insert(quotes).values(quoteData).returning();
    return quote;
  }

  async updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [quote] = await this.db
      .update(quotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async deleteQuote(id: string): Promise<void> {
    await this.db.delete(quotes).where(eq(quotes.id, id));
  }

  // Quote attachment operations
  async getQuoteAttachment(id: string): Promise<QuoteAttachment | undefined> {
    const [result] = await this.db
      .select()
      .from(quoteAttachments)
      .where(eq(quoteAttachments.id, id));
    return result;
  }

  async getQuoteAttachments(quoteId: string): Promise<QuoteAttachment[]> {
    return await this.db
      .select()
      .from(quoteAttachments)
      .where(eq(quoteAttachments.quoteId, quoteId));
  }

  async createQuoteAttachment(attachment: InsertQuoteAttachment): Promise<QuoteAttachment> {
    const [result] = await this.db.insert(quoteAttachments).values(attachment).returning();
    return result;
  }

  async deleteQuoteAttachment(id: string): Promise<void> {
    await this.db.delete(quoteAttachments).where(eq(quoteAttachments.id, id));
  }

  // Email template operations
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await this.db.select().from(emailTemplates).orderBy(emailTemplates.name);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await this.db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async getEmailTemplatesByTrigger(trigger: string): Promise<EmailTemplate[]> {
    return await this.db.select().from(emailTemplates).where(eq(emailTemplates.trigger, trigger));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [created] = await this.db
      .insert(emailTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateEmailTemplate(id: string, data: { subject?: string; body?: string; name?: string }): Promise<EmailTemplate | undefined> {
    const [updated] = await this.db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await this.db.delete(emailTemplates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.isCustom, true)));
  }

  // Email log operations
  async getEmailLogs(filters?: { templateType?: string; status?: string; search?: string }): Promise<EmailLog[]> {
    const conditions = [];
    if (filters?.templateType) {
      conditions.push(eq(emailLogs.templateType, filters.templateType));
    }
    if (filters?.status) {
      conditions.push(eq(emailLogs.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(
        or(
          sql`${emailLogs.recipientEmail} ILIKE ${'%' + filters.search + '%'}`,
          sql`${emailLogs.recipientName} ILIKE ${'%' + filters.search + '%'}`,
          sql`${emailLogs.subject} ILIKE ${'%' + filters.search + '%'}`
        )
      );
    }

    const query = this.db.select().from(emailLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(emailLogs.sentAt)).limit(200);
    }
    return await query.orderBy(desc(emailLogs.sentAt)).limit(200);
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [created] = await this.db.insert(emailLogs).values(log).returning();
    return created;
  }

  // Notification settings operations
  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return await this.db.select().from(notificationSettings).orderBy(notificationSettings.label);
  }

  async getNotificationSetting(type: string): Promise<NotificationSetting | undefined> {
    const [setting] = await this.db.select().from(notificationSettings).where(eq(notificationSettings.type, type));
    return setting;
  }

  async upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting> {
    const [created] = await this.db
      .insert(notificationSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: notificationSettings.type,
        set: { ...setting, updatedAt: new Date() },
      })
      .returning();
    return created;
  }

  async updateNotificationSetting(id: string, data: { emailEnabled?: boolean; inAppEnabled?: boolean }): Promise<NotificationSetting | undefined> {
    const [updated] = await this.db
      .update(notificationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationSettings.id, id))
      .returning();
    return updated;
  }

  // ─── Availability Schedule operations ────────────────────────────────────
  async getUserAvailability(userId: string): Promise<AvailabilitySchedule[]> {
    return await this.db.select().from(availabilitySchedules)
      .where(eq(availabilitySchedules.userId, userId))
      .orderBy(availabilitySchedules.dayOfWeek);
  }

  async upsertUserAvailability(userId: string, schedules: InsertAvailabilitySchedule[]): Promise<AvailabilitySchedule[]> {
    await this.db.delete(availabilitySchedules).where(eq(availabilitySchedules.userId, userId));
    if (schedules.length === 0) return [];
    return await this.db.insert(availabilitySchedules).values(schedules).returning();
  }

  // ─── User Skills operations ──────────────────────────────────────────────
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    return await this.db.select().from(userSkills).where(eq(userSkills.userId, userId));
  }

  async createUserSkill(skill: InsertUserSkill): Promise<UserSkill> {
    const [created] = await this.db.insert(userSkills).values(skill).returning();
    return created;
  }

  async deleteUserSkill(id: string): Promise<void> {
    await this.db.delete(userSkills).where(eq(userSkills.id, id));
  }

  async getAllUserSkills(): Promise<UserSkill[]> {
    return await this.db.select().from(userSkills);
  }

  // ─── Task Dependencies operations ────────────────────────────────────────
  async getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    return await this.db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
  }

  async createTaskDependency(dep: InsertTaskDependency): Promise<TaskDependency> {
    const [created] = await this.db.insert(taskDependencies).values(dep).returning();
    return created;
  }

  async deleteTaskDependency(id: string): Promise<void> {
    await this.db.delete(taskDependencies).where(eq(taskDependencies.id, id));
  }

  // ─── SLA Configs operations ──────────────────────────────────────────────
  async getSlaConfigs(): Promise<SlaConfig[]> {
    return await this.db.select().from(slaConfigs).orderBy(slaConfigs.urgencyLevel);
  }

  async upsertSlaConfig(urgencyLevel: string, data: { responseHours: number; resolutionHours: number }): Promise<SlaConfig> {
    const existing = await this.db.select().from(slaConfigs).where(eq(slaConfigs.urgencyLevel, urgencyLevel));
    if (existing.length > 0) {
      const [updated] = await this.db.update(slaConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(slaConfigs.urgencyLevel, urgencyLevel))
        .returning();
      return updated;
    } else {
      const [created] = await this.db.insert(slaConfigs).values({ urgencyLevel, ...data }).returning();
      return created;
    }
  }

  // ─── AI Agent Log operations ─────────────────────────────────────────────
  async createAiAgentLog(log: InsertAiAgentLog): Promise<AiAgentLog> {
    const [created] = await this.db.insert(aiAgentLogs).values(log).returning();
    return created;
  }

  async getAiAgentLogs(filters?: { status?: string; entityType?: string; limit?: number }): Promise<AiAgentLog[]> {
    let query = this.db.select().from(aiAgentLogs) as any;
    const conditions = [];
    if (filters?.status) conditions.push(eq(aiAgentLogs.status, filters.status as any));
    if (filters?.entityType) conditions.push(eq(aiAgentLogs.entityType, filters.entityType));
    if (conditions.length > 0) query = query.where(and(...conditions));
    query = query.orderBy(desc(aiAgentLogs.createdAt));
    if (filters?.limit) query = query.limit(filters.limit);
    return await query;
  }

  async updateAiAgentLog(id: string, data: { status: string; reviewedBy?: string }): Promise<AiAgentLog | undefined> {
    const [updated] = await this.db.update(aiAgentLogs)
      .set({ ...data, reviewedAt: new Date() } as any)
      .where(eq(aiAgentLogs.id, id))
      .returning();
    return updated;
  }

  // ─── Password reset token operations ─────────────────────────────────────
  async createResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async getResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await this.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row;
  }

  async markResetTokenUsed(token: string): Promise<void> {
    await this.db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
  }

  // ─── Resource Library operations ─────────────────────────────────────────

  async getResourceCategories(): Promise<ResourceCategory[]> {
    return await this.db.select().from(resourceCategories).orderBy(resourceCategories.name);
  }

  async createResourceCategory(data: InsertResourceCategory): Promise<ResourceCategory> {
    const [created] = await this.db.insert(resourceCategories).values(data).returning();
    return created;
  }

  async getResourceFolders(parentId?: string | null): Promise<ResourceFolder[]> {
    if (parentId === null || parentId === undefined) {
      return await this.db.select().from(resourceFolders)
        .where(isNull(resourceFolders.parentId))
        .orderBy(resourceFolders.name);
    }
    return await this.db.select().from(resourceFolders)
      .where(eq(resourceFolders.parentId, parentId))
      .orderBy(resourceFolders.name);
  }

  async getAllResourceFolders(): Promise<ResourceFolder[]> {
    return await this.db.select().from(resourceFolders).orderBy(resourceFolders.name);
  }

  async getResourceFolderById(id: string): Promise<(ResourceFolder & { breadcrumbs: { id: string; name: string }[] }) | undefined> {
    const [folder] = await this.db.select().from(resourceFolders).where(eq(resourceFolders.id, id));
    if (!folder) return undefined;

    const breadcrumbs: { id: string; name: string }[] = [];
    const visited = new Set<string>();
    let current: ResourceFolder | undefined = folder;
    while (current && !visited.has(current.id) && breadcrumbs.length < 50) {
      visited.add(current.id);
      breadcrumbs.unshift({ id: current.id, name: current.name });
      if (current.parentId) {
        const [parent] = await this.db.select().from(resourceFolders).where(eq(resourceFolders.id, current.parentId));
        current = parent;
      } else {
        current = undefined;
      }
    }

    return { ...folder, breadcrumbs };
  }

  async createResourceFolder(data: InsertResourceFolder): Promise<ResourceFolder> {
    const [created] = await this.db.insert(resourceFolders).values(data as any).returning();
    return created;
  }

  async updateResourceFolder(id: string, data: Partial<InsertResourceFolder>): Promise<ResourceFolder | undefined> {
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new Error("A folder cannot be its own parent");
      }
      if (data.parentId) {
        const visited = new Set<string>();
        visited.add(id);
        let currentId: string | null = data.parentId;
        while (currentId) {
          if (visited.has(currentId)) {
            throw new Error("Moving this folder would create a circular reference");
          }
          visited.add(currentId);
          const [parent] = await this.db.select().from(resourceFolders).where(eq(resourceFolders.id, currentId));
          currentId = parent?.parentId || null;
        }
      }
    }
    const [updated] = await this.db.update(resourceFolders).set(data as any).where(eq(resourceFolders.id, id)).returning();
    return updated;
  }

  async deleteResourceFolder(id: string, visited?: Set<string>): Promise<void> {
    const seen = visited || new Set<string>();
    if (seen.has(id)) return;
    seen.add(id);
    await this.db.update(resources).set({ folderId: null }).where(eq(resources.folderId, id));
    const childFolders = await this.db.select().from(resourceFolders).where(eq(resourceFolders.parentId, id));
    for (const child of childFolders) {
      await this.deleteResourceFolder(child.id, seen);
    }
    await this.db.delete(resourceFolders).where(eq(resourceFolders.id, id));
  }

  async getResources(filters?: { categoryId?: string; type?: string; folderId?: string | null }): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]> {
    const rows = await this.db.select().from(resources)
      .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
      .orderBy(desc(resources.createdAt));

    const filtered = rows.filter(row => {
      if (filters?.categoryId && row.resources.categoryId !== filters.categoryId) return false;
      if (filters?.type && row.resources.type !== filters.type) return false;
      if (filters && 'folderId' in filters) {
        if (filters.folderId === null) {
          if (row.resources.folderId !== null) return false;
        } else if (filters.folderId !== undefined) {
          if (row.resources.folderId !== filters.folderId) return false;
        }
      }
      return true;
    });

    const result = await Promise.all(filtered.map(async (row) => {
      const propRows = await this.db.select({ propertyId: propertyResources.propertyId })
        .from(propertyResources)
        .where(eq(propertyResources.resourceId, row.resources.id));
      return {
        ...row.resources,
        category: row.resource_categories,
        propertyIds: propRows.map(p => p.propertyId),
      };
    }));
    return result;
  }

  async getResourceById(id: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] }) | undefined> {
    const [row] = await this.db.select().from(resources)
      .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
      .where(eq(resources.id, id));
    if (!row) return undefined;
    const propRows = await this.db.select({ propertyId: propertyResources.propertyId })
      .from(propertyResources)
      .where(eq(propertyResources.resourceId, id));
    return {
      ...row.resources,
      category: row.resource_categories,
      propertyIds: propRows.map(p => p.propertyId),
    };
  }

  async createResource(data: InsertResource, propertyIds: string[]): Promise<Resource> {
    const [created] = await this.db.insert(resources).values(data as any).returning();
    if (propertyIds.length > 0) {
      await this.db.insert(propertyResources).values(
        propertyIds.map(pid => ({ propertyId: pid, resourceId: created.id }))
      ).onConflictDoNothing();
    }
    return created;
  }

  async updateResource(id: string, data: Partial<InsertResource>, propertyIds: string[]): Promise<Resource | undefined> {
    const [updated] = await this.db.update(resources).set(data as any).where(eq(resources.id, id)).returning();
    if (!updated) return undefined;
    await this.db.delete(propertyResources).where(eq(propertyResources.resourceId, id));
    if (propertyIds.length > 0) {
      await this.db.insert(propertyResources).values(
        propertyIds.map(pid => ({ propertyId: pid, resourceId: id }))
      ).onConflictDoNothing();
    }
    return updated;
  }

  async deleteResource(id: string): Promise<void> {
    await this.db.delete(propertyResources).where(eq(propertyResources.resourceId, id));
    await this.db.delete(resources).where(eq(resources.id, id));
  }

  async getPropertyResources(propertyId: string): Promise<(Resource & { category: ResourceCategory | null })[]> {
    const rows = await this.db.select().from(propertyResources)
      .innerJoin(resources, eq(propertyResources.resourceId, resources.id))
      .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
      .where(eq(propertyResources.propertyId, propertyId))
      .orderBy(resourceCategories.name, resources.title);
    return rows.map(row => ({
      ...row.resources,
      category: row.resource_categories,
    }));
  }

  async getEquipmentResources(equipmentId: string): Promise<(Resource & { category: ResourceCategory | null; propertyIds: string[] })[]> {
    const item = await this.getEquipmentItem(equipmentId);
    if (!item) return [];

    const rows = await this.db.select().from(resources)
      .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
      .where(
        or(
          sql`${resources.equipmentId}::text = ${equipmentId}`,
          eq(resources.equipmentCategory, item.category)
        )
      )
      .orderBy(resources.title);

    const seen = new Set<string>();
    const result = await Promise.all(
      rows
        .filter(row => {
          if (seen.has(row.resources.id)) return false;
          seen.add(row.resources.id);
          return true;
        })
        .map(async (row) => {
          const propRows = await this.db.select({ propertyId: propertyResources.propertyId })
            .from(propertyResources)
            .where(eq(propertyResources.resourceId, row.resources.id));
          return {
            ...row.resources,
            category: row.resource_categories,
            propertyIds: propRows.map(p => p.propertyId),
          };
        })
    );
    return result;
  }
}

export const storage = new DatabaseStorage();