import type {
  User,
  UpsertUser,
  Vendor,
  InsertVendor,
  InventoryItem,
  InsertInventoryItem,
  Area,
  InsertArea,
  Subdivision,
  InsertSubdivision,
  ServiceRequest,
  InsertServiceRequest,
  Task,
  InsertTask,
  TimeEntry,
  InsertTimeEntry,
  PartUsed,
  InsertPartUsed,
  Message,
  InsertMessage,
  Upload,
  InsertUpload,
  TaskNote,
  InsertTaskNote,
  TaskChecklistGroup,
  InsertTaskChecklistGroup,
  TaskChecklistItem,
  InsertTaskChecklistItem,
  ChecklistTemplate,
  InsertChecklistTemplate,
  Property,
  InsertProperty,
  Space,
  InsertSpace,
  Equipment,
  InsertEquipment,
  Lockbox,
  InsertLockbox,
  LockboxCode,
  InsertLockboxCode,
  Vehicle,
  InsertVehicle,
  VehicleReservation,
  InsertVehicleReservation,
  VehicleCheckOutLog,
  InsertVehicleCheckOutLog,
  VehicleCheckInLog,
  InsertVehicleCheckInLog,
  VehicleMaintenanceSchedule,
  InsertVehicleMaintenanceSchedule,
  VehicleMaintenanceLog,
  InsertVehicleMaintenanceLog,
  VehicleDocument,
  InsertVehicleDocument,
  EmergencyContact,
  InsertEmergencyContact,
  Notification,
  InsertNotification,
  Project,
  InsertProject,
  ProjectComment,
  InsertProjectComment,
  ProjectTeamMember,
  InsertProjectTeamMember,
  ProjectVendor,
  InsertProjectVendor,
  Quote,
  InsertQuote,
  QuoteAttachment,
  InsertQuoteAttachment,
  EmailTemplate,
  InsertEmailTemplate,
  EmailLog,
  InsertEmailLog,
  NotificationSetting,
  InsertNotificationSetting,
  AvailabilitySchedule,
  InsertAvailabilitySchedule,
  UserSkill,
  InsertUserSkill,
  TaskDependency,
  InsertTaskDependency,
  SlaConfig,
  AiAgentLog,
  InsertAiAgentLog,
  PasswordResetToken,
  ResourceCategory,
  InsertResourceCategory,
  ResourceFolder,
  InsertResourceFolder,
  Resource,
  InsertResource,
  TaskHelper,
  PendingUser,
  InsertPendingUser,
} from "@shared/schema";

import * as userStorage from "./users";
import * as vendorStorage from "./vendors";
import * as inventoryStorage from "./inventory";
import * as facilityStorage from "./facilities";
import * as serviceRequestStorage from "./serviceRequests";
import * as workOrderStorage from "./workOrders";
import * as vehicleStorage from "./vehicles";
import * as messagingStorage from "./messaging";
import * as projectStorage from "./projects";
import * as miscStorage from "./misc";
import * as resourceStorage from "./resources";

export interface IStorage {
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
  getUsersByRoles(roles: string[]): Promise<User[]>;
  createUser(userData: {
    username: string;
    password: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }): Promise<User>;

  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;

  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<void>;
  updateInventoryQuantity(id: string, quantityChange: number): Promise<InventoryItem | undefined>;
  getInventoryItemByBarcode(barcode: string): Promise<InventoryItem | undefined>;
  updateInventoryStatus(id: string, stockStatus: string): Promise<InventoryItem | undefined>;
  useOneContainer(id: string): Promise<InventoryItem | undefined>;

  getAreas(): Promise<Area[]>;
  createArea(area: InsertArea): Promise<Area>;
  deleteArea(id: string): Promise<void>;

  getSubdivisionsByArea(areaId: string): Promise<Subdivision[]>;
  createSubdivision(subdivision: InsertSubdivision): Promise<Subdivision>;
  deleteSubdivision(id: string): Promise<void>;

  getServiceRequests(filters?: { userId?: string; status?: string }): Promise<ServiceRequest[]>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined>;
  deleteServiceRequest(id: string): Promise<void>;
  updateServiceRequestStatus(id: string, status: string, rejectionReason?: string): Promise<ServiceRequest | undefined>;

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
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  updateTaskStatus(id: string, status: string, onHoldReason?: string, actualCompletionDate?: Date): Promise<Task | undefined>;
  getSubTasks(parentTaskId: string): Promise<Task[]>;
  getAvailablePoolTasks(pool: string): Promise<Task[]>;
  getAvailablePoolTaskCount(pool: string): Promise<number>;
  backfillTaskPools(): Promise<number>;
  claimTask(taskId: string, userId: string, pool: string): Promise<Task | null>;

  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  updateTimeEntry(id: string, endTime: Date, durationMinutes: number): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<void>;
  getTimeEntriesByTask(taskId: string): Promise<TimeEntry[]>;

  createPartUsed(part: InsertPartUsed): Promise<PartUsed>;
  deletePartUsed(id: string): Promise<void>;
  getPartsByTask(taskId: string): Promise<PartUsed[]>;

  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRequest(requestId: string): Promise<Message[]>;
  getMessagesByTask(taskId: string): Promise<Message[]>;
  getMessages(): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  markMessagesAsRead(requestId: string, userId: string): Promise<void>;
  markTaskMessagesAsRead(taskId: string, userId: string): Promise<void>;

  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getTaskNote(id: string): Promise<TaskNote | undefined>;
  getNotesByTask(taskId: string): Promise<TaskNote[]>;
  updateTaskNote(id: string, content: string): Promise<TaskNote>;
  deleteTaskNote(id: string): Promise<void>;

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

  createUpload(upload: InsertUpload): Promise<Upload>;
  getUploadsByRequest(requestId: string): Promise<Upload[]>;
  getUploadsByTask(taskId: string): Promise<Upload[]>;
  getUploadsByEquipment(equipmentId: string): Promise<Upload[]>;
  getUploadsByVehicleCheckOutLog(checkOutLogId: string): Promise<Upload[]>;
  getUploadsByVehicleCheckInLog(checkInLogId: string): Promise<Upload[]>;
  getUpload(id: string): Promise<Upload | undefined>;
  deleteUpload(id: string): Promise<void>;

  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;
  getTasksByProperty(propertyId: string): Promise<Task[]>;

  getSpaces(): Promise<Space[]>;
  getSpace(id: string): Promise<Space | undefined>;
  getSpacesByProperty(propertyId: string): Promise<Space[]>;
  createSpace(space: InsertSpace): Promise<Space>;
  updateSpace(id: string, data: Partial<InsertSpace>): Promise<Space | undefined>;
  deleteSpace(id: string): Promise<void>;

  getEquipment(): Promise<Equipment[]>;
  getEquipmentItem(id: string): Promise<Equipment | undefined>;
  getEquipmentByProperty(propertyId: string): Promise<Equipment[]>;
  getEquipmentBySpace(spaceId: string): Promise<Equipment[]>;
  getEquipmentByPropertyAndSpace(propertyId: string, spaceId: string): Promise<Equipment[]>;
  getEquipmentByCategory(propertyId: string, category: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, data: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;

  getLockboxes(): Promise<Lockbox[]>;
  getLockbox(id: string): Promise<Lockbox | undefined>;
  createLockbox(lockbox: InsertLockbox): Promise<Lockbox>;
  updateLockbox(id: string, data: Partial<InsertLockbox>): Promise<Lockbox | undefined>;
  deleteLockbox(id: string): Promise<void>;

  getLockboxCodes(lockboxId: string): Promise<LockboxCode[]>;
  getLockboxCode(id: string): Promise<LockboxCode | undefined>;
  createLockboxCode(code: InsertLockboxCode): Promise<LockboxCode>;
  updateLockboxCode(id: string, data: Partial<InsertLockboxCode>): Promise<LockboxCode | undefined>;
  deleteLockboxCode(id: string): Promise<void>;
  assignRandomCode(lockboxId: string): Promise<LockboxCode | null>;

  getVehicles(filters?: { status?: string }): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByVehicleId(vehicleId: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  updateVehicleStatus(id: string, status: string): Promise<Vehicle | undefined>;
  updateVehicleMileage(id: string, mileage: number): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<void>;

  getVehicleReservations(filters?: { vehicleId?: string; userId?: string; status?: string }): Promise<VehicleReservation[]>;
  getVehicleReservation(id: string): Promise<VehicleReservation | undefined>;
  createVehicleReservation(reservation: InsertVehicleReservation): Promise<VehicleReservation>;
  updateVehicleReservation(id: string, data: Partial<InsertVehicleReservation>): Promise<VehicleReservation | undefined>;
  updateReservationStatus(id: string, status: string): Promise<VehicleReservation | undefined>;
  deleteVehicleReservation(id: string): Promise<void>;
  checkVehicleAvailability(vehicleId: string, startDate: Date, endDate: Date, excludeReservationId?: string): Promise<boolean>;

  getVehicleCheckOutLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckOutLog[]>;
  getVehicleCheckOutLog(id: string): Promise<VehicleCheckOutLog | undefined>;
  getCheckOutLogByReservation(reservationId: string): Promise<VehicleCheckOutLog | undefined>;
  createVehicleCheckOutLog(log: InsertVehicleCheckOutLog): Promise<VehicleCheckOutLog>;
  deleteVehicleCheckOutLog(id: string): Promise<void>;

  getVehicleCheckInLogs(filters?: { vehicleId?: string; userId?: string }): Promise<VehicleCheckInLog[]>;
  getVehicleCheckInLog(id: string): Promise<VehicleCheckInLog | undefined>;
  getCheckInLogByCheckOut(checkOutLogId: string): Promise<VehicleCheckInLog | undefined>;
  createVehicleCheckInLog(log: InsertVehicleCheckInLog): Promise<VehicleCheckInLog>;
  updateVehicleCheckInLog(id: string, data: Partial<InsertVehicleCheckInLog>): Promise<VehicleCheckInLog | undefined>;
  deleteVehicleCheckInLog(id: string): Promise<void>;

  getVehicleMaintenanceSchedules(vehicleId?: string): Promise<VehicleMaintenanceSchedule[]>;
  getVehicleMaintenanceSchedule(id: string): Promise<VehicleMaintenanceSchedule | undefined>;
  createVehicleMaintenanceSchedule(schedule: InsertVehicleMaintenanceSchedule): Promise<VehicleMaintenanceSchedule>;
  updateVehicleMaintenanceSchedule(id: string, data: Partial<InsertVehicleMaintenanceSchedule>): Promise<VehicleMaintenanceSchedule | undefined>;
  deleteVehicleMaintenanceSchedule(id: string): Promise<void>;

  getVehicleMaintenanceLogs(vehicleId: string): Promise<VehicleMaintenanceLog[]>;
  getVehicleMaintenanceLogByTaskId(taskId: string): Promise<VehicleMaintenanceLog | undefined>;
  createVehicleMaintenanceLog(log: InsertVehicleMaintenanceLog): Promise<VehicleMaintenanceLog>;
  deleteVehicleMaintenanceLog(id: string): Promise<void>;

  getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]>;
  getVehicleDocument(id: string): Promise<VehicleDocument | undefined>;
  createVehicleDocument(document: InsertVehicleDocument): Promise<VehicleDocument>;
  updateVehicleDocument(id: string, data: Partial<InsertVehicleDocument>): Promise<VehicleDocument | undefined>;
  deleteVehicleDocument(id: string): Promise<void>;
  getExpiringDocuments(daysAhead: number): Promise<(VehicleDocument & { vehicle: { id: string; vehicleId: string; make: string; model: string } })[]>;
  markDocumentReminderSent(id: string): Promise<VehicleDocument | undefined>;

  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: string, data: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined>;
  deleteChecklistTemplate(id: string): Promise<void>;

  getEmergencyContacts(): Promise<EmergencyContact[]>;
  getActiveEmergencyContact(): Promise<EmergencyContact | undefined>;
  getEmergencyContact(id: string): Promise<EmergencyContact | undefined>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: string, data: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: string): Promise<void>;
  setActiveEmergencyContact(id: string): Promise<EmergencyContact | undefined>;
  clearActiveEmergencyContact(): Promise<void>;

  getNotifications(userId?: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId?: string): Promise<number>;
  hasNotificationForRelatedItem(relatedId: string, type: string): Promise<boolean>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId?: string): Promise<void>;
  dismissNotification(id: string): Promise<void>;
  dismissAllNotifications(userId?: string): Promise<void>;

  getProjects(filters?: { status?: string; createdById?: string }): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  getTasksByProject(projectId: string): Promise<Task[]>;

  getProjectComments(projectId: string): Promise<ProjectComment[]>;
  createProjectComment(comment: InsertProjectComment): Promise<ProjectComment>;
  deleteProjectComment(id: string): Promise<void>;

  getUploadsByProject(projectId: string): Promise<Upload[]>;

  getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]>;
  addProjectTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember>;
  removeProjectTeamMember(id: string): Promise<void>;
  updateProjectTeamMember(id: string, data: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined>;

  getProjectVendors(projectId: string): Promise<ProjectVendor[]>;
  addProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor>;
  removeProjectVendor(id: string): Promise<void>;
  updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined>;

  getQuotes(filters?: { taskId?: string; status?: string }): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByTaskId(taskId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;

  getQuoteAttachment(id: string): Promise<QuoteAttachment | undefined>;
  getQuoteAttachments(quoteId: string): Promise<QuoteAttachment[]>;
  createQuoteAttachment(attachment: InsertQuoteAttachment): Promise<QuoteAttachment>;
  deleteQuoteAttachment(id: string): Promise<void>;

  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByTrigger(trigger: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: { subject?: string; body?: string; name?: string }): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  getEmailLogs(filters?: { templateType?: string; status?: string; search?: string }): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;

  getNotificationSettings(): Promise<NotificationSetting[]>;
  getNotificationSetting(type: string): Promise<NotificationSetting | undefined>;
  upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting>;
  updateNotificationSetting(id: string, data: { emailEnabled?: boolean; inAppEnabled?: boolean }): Promise<NotificationSetting | undefined>;

  getUserAvailability(userId: string): Promise<AvailabilitySchedule[]>;
  upsertUserAvailability(userId: string, schedules: InsertAvailabilitySchedule[]): Promise<AvailabilitySchedule[]>;

  getUserSkills(userId: string): Promise<UserSkill[]>;
  createUserSkill(skill: InsertUserSkill): Promise<UserSkill>;
  deleteUserSkill(id: string): Promise<void>;
  getAllUserSkills(): Promise<UserSkill[]>;

  getTaskDependencies(taskId: string): Promise<TaskDependency[]>;
  createTaskDependency(dep: InsertTaskDependency): Promise<TaskDependency>;
  deleteTaskDependency(id: string): Promise<void>;

  getSlaConfigs(): Promise<SlaConfig[]>;
  upsertSlaConfig(urgencyLevel: string, data: { responseHours: number; resolutionHours: number }): Promise<SlaConfig>;

  createAiAgentLog(log: InsertAiAgentLog): Promise<AiAgentLog>;
  getAiAgentLogs(filters?: { status?: string; entityType?: string; limit?: number }): Promise<AiAgentLog[]>;
  updateAiAgentLog(id: string, data: { status: string; reviewedBy?: string }): Promise<AiAgentLog | undefined>;

  createResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  markResetTokenUsed(token: string): Promise<void>;

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

  addTaskHelper(taskId: string, userId: string): Promise<TaskHelper>;
  removeTaskHelper(taskId: string, userId: string): Promise<void>;
  getTaskHelpers(taskId: string): Promise<TaskHelper[]>;
  getHelperTaskIds(userId: string): Promise<string[]>;
  isTaskHelper(taskId: string, userId: string): Promise<boolean>;

  getPendingUsers(status?: string): Promise<PendingUser[]>;
  getPendingUser(id: string): Promise<PendingUser | undefined>;
  getPendingUserByUsername(username: string): Promise<PendingUser | undefined>;
  getPendingUserByEmail(email: string): Promise<PendingUser | undefined>;
  createPendingUser(data: InsertPendingUser): Promise<PendingUser>;
  updatePendingUser(id: string, data: Partial<PendingUser>): Promise<PendingUser | undefined>;
  deletePendingUser(id: string): Promise<void>;
  getPendingUserCount(): Promise<number>;
  expireOldPendingUsers(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  getUser = userStorage.getUser;
  upsertUser = userStorage.upsertUser;
  updateUserRole = userStorage.updateUserRole;
  updateUserPassword = userStorage.updateUserPassword;
  updateUser = userStorage.updateUser;
  deleteUser = userStorage.deleteUser;
  getAllUsers = userStorage.getAllUsers;
  getUserByUsername = userStorage.getUserByUsername;
  getUserByEmail = userStorage.getUserByEmail;
  getUsersByRoles = userStorage.getUsersByRoles;
  createUser = userStorage.createUser;
  getUserAvailability = userStorage.getUserAvailability;
  upsertUserAvailability = userStorage.upsertUserAvailability;
  getUserSkills = userStorage.getUserSkills;
  createUserSkill = userStorage.createUserSkill;
  deleteUserSkill = userStorage.deleteUserSkill;
  getAllUserSkills = userStorage.getAllUserSkills;
  createResetToken = userStorage.createResetToken;
  getResetTokenByToken = userStorage.getResetTokenByToken;
  markResetTokenUsed = userStorage.markResetTokenUsed;
  getPendingUsers = userStorage.getPendingUsers;
  getPendingUser = userStorage.getPendingUser;
  getPendingUserByUsername = userStorage.getPendingUserByUsername;
  getPendingUserByEmail = userStorage.getPendingUserByEmail;
  createPendingUser = userStorage.createPendingUser;
  updatePendingUser = userStorage.updatePendingUser;
  deletePendingUser = userStorage.deletePendingUser;
  getPendingUserCount = userStorage.getPendingUserCount;
  expireOldPendingUsers = userStorage.expireOldPendingUsers;

  getVendors = vendorStorage.getVendors;
  getVendor = vendorStorage.getVendor;
  createVendor = vendorStorage.createVendor;
  updateVendor = vendorStorage.updateVendor;
  deleteVendor = vendorStorage.deleteVendor;

  getInventoryItems = inventoryStorage.getInventoryItems;
  getInventoryItem = inventoryStorage.getInventoryItem;
  createInventoryItem = inventoryStorage.createInventoryItem;
  updateInventoryItem = inventoryStorage.updateInventoryItem;
  deleteInventoryItem = inventoryStorage.deleteInventoryItem;
  updateInventoryQuantity = inventoryStorage.updateInventoryQuantity;
  getInventoryItemByBarcode = inventoryStorage.getInventoryItemByBarcode;
  updateInventoryStatus = inventoryStorage.updateInventoryStatus;
  useOneContainer = inventoryStorage.useOneContainer;
  createPartUsed = inventoryStorage.createPartUsed;
  deletePartUsed = inventoryStorage.deletePartUsed;
  getPartsByTask = inventoryStorage.getPartsByTask;

  getAreas = facilityStorage.getAreas;
  createArea = facilityStorage.createArea;
  deleteArea = facilityStorage.deleteArea;
  getSubdivisionsByArea = facilityStorage.getSubdivisionsByArea;
  createSubdivision = facilityStorage.createSubdivision;
  deleteSubdivision = facilityStorage.deleteSubdivision;
  getProperties = facilityStorage.getProperties;
  getProperty = facilityStorage.getProperty;
  createProperty = facilityStorage.createProperty;
  updateProperty = facilityStorage.updateProperty;
  deleteProperty = facilityStorage.deleteProperty;
  getTasksByProperty = facilityStorage.getTasksByProperty;
  getSpaces = facilityStorage.getSpaces;
  getSpace = facilityStorage.getSpace;
  getSpacesByProperty = facilityStorage.getSpacesByProperty;
  createSpace = facilityStorage.createSpace;
  updateSpace = facilityStorage.updateSpace;
  deleteSpace = facilityStorage.deleteSpace;
  getEquipment = facilityStorage.getEquipment;
  getEquipmentItem = facilityStorage.getEquipmentItem;
  getEquipmentByProperty = facilityStorage.getEquipmentByProperty;
  getEquipmentBySpace = facilityStorage.getEquipmentBySpace;
  getEquipmentByPropertyAndSpace = facilityStorage.getEquipmentByPropertyAndSpace;
  getEquipmentByCategory = facilityStorage.getEquipmentByCategory;
  createEquipment = facilityStorage.createEquipment;
  updateEquipment = facilityStorage.updateEquipment;
  deleteEquipment = facilityStorage.deleteEquipment;
  getLockboxes = facilityStorage.getLockboxes;
  getLockbox = facilityStorage.getLockbox;
  createLockbox = facilityStorage.createLockbox;
  updateLockbox = facilityStorage.updateLockbox;
  deleteLockbox = facilityStorage.deleteLockbox;
  getLockboxCodes = facilityStorage.getLockboxCodes;
  getLockboxCode = facilityStorage.getLockboxCode;
  createLockboxCode = facilityStorage.createLockboxCode;
  updateLockboxCode = facilityStorage.updateLockboxCode;
  deleteLockboxCode = facilityStorage.deleteLockboxCode;
  assignRandomCode = facilityStorage.assignRandomCode;

  getServiceRequests = serviceRequestStorage.getServiceRequests;
  getServiceRequest = serviceRequestStorage.getServiceRequest;
  createServiceRequest = serviceRequestStorage.createServiceRequest;
  updateServiceRequest = serviceRequestStorage.updateServiceRequest;
  deleteServiceRequest = serviceRequestStorage.deleteServiceRequest;
  updateServiceRequestStatus = serviceRequestStorage.updateServiceRequestStatus;

  getTasks = workOrderStorage.getTasks;
  getTask = workOrderStorage.getTask;
  createTask = workOrderStorage.createTask;
  updateTask = workOrderStorage.updateTask;
  deleteTask = workOrderStorage.deleteTask;
  updateTaskStatus = workOrderStorage.updateTaskStatus;
  getSubTasks = workOrderStorage.getSubTasks;
  getAvailablePoolTasks = workOrderStorage.getAvailablePoolTasks;
  getAvailablePoolTaskCount = workOrderStorage.getAvailablePoolTaskCount;
  backfillTaskPools = workOrderStorage.backfillTaskPools;
  claimTask = workOrderStorage.claimTask;
  createTimeEntry = workOrderStorage.createTimeEntry;
  getTimeEntry = workOrderStorage.getTimeEntry;
  updateTimeEntry = workOrderStorage.updateTimeEntry;
  deleteTimeEntry = workOrderStorage.deleteTimeEntry;
  getTimeEntriesByTask = workOrderStorage.getTimeEntriesByTask;
  createTaskNote = workOrderStorage.createTaskNote;
  getTaskNote = workOrderStorage.getTaskNote;
  getNotesByTask = workOrderStorage.getNotesByTask;
  updateTaskNote = workOrderStorage.updateTaskNote;
  deleteTaskNote = workOrderStorage.deleteTaskNote;
  getChecklistGroupsByTask = workOrderStorage.getChecklistGroupsByTask;
  getChecklistGroup = workOrderStorage.getChecklistGroup;
  createChecklistGroup = workOrderStorage.createChecklistGroup;
  updateChecklistGroup = workOrderStorage.updateChecklistGroup;
  deleteChecklistGroup = workOrderStorage.deleteChecklistGroup;
  getChecklistItem = workOrderStorage.getChecklistItem;
  createChecklistItem = workOrderStorage.createChecklistItem;
  updateChecklistItem = workOrderStorage.updateChecklistItem;
  deleteChecklistItem = workOrderStorage.deleteChecklistItem;
  createTaskWithChecklistGroups = workOrderStorage.createTaskWithChecklistGroups;
  getChecklistTemplates = workOrderStorage.getChecklistTemplates;
  getChecklistTemplate = workOrderStorage.getChecklistTemplate;
  createChecklistTemplate = workOrderStorage.createChecklistTemplate;
  updateChecklistTemplate = workOrderStorage.updateChecklistTemplate;
  deleteChecklistTemplate = workOrderStorage.deleteChecklistTemplate;
  getTaskDependencies = workOrderStorage.getTaskDependencies;
  createTaskDependency = workOrderStorage.createTaskDependency;
  deleteTaskDependency = workOrderStorage.deleteTaskDependency;
  getSlaConfigs = workOrderStorage.getSlaConfigs;
  upsertSlaConfig = workOrderStorage.upsertSlaConfig;
  addTaskHelper = workOrderStorage.addTaskHelper;
  removeTaskHelper = workOrderStorage.removeTaskHelper;
  getTaskHelpers = workOrderStorage.getTaskHelpers;
  getHelperTaskIds = workOrderStorage.getHelperTaskIds;
  isTaskHelper = workOrderStorage.isTaskHelper;

  getVehicles = vehicleStorage.getVehicles;
  getVehicle = vehicleStorage.getVehicle;
  getVehicleByVehicleId = vehicleStorage.getVehicleByVehicleId;
  createVehicle = vehicleStorage.createVehicle;
  updateVehicle = vehicleStorage.updateVehicle;
  updateVehicleStatus = vehicleStorage.updateVehicleStatus;
  updateVehicleMileage = vehicleStorage.updateVehicleMileage;
  deleteVehicle = vehicleStorage.deleteVehicle;
  getVehicleReservations = vehicleStorage.getVehicleReservations;
  getVehicleReservation = vehicleStorage.getVehicleReservation;
  createVehicleReservation = vehicleStorage.createVehicleReservation;
  updateVehicleReservation = vehicleStorage.updateVehicleReservation;
  updateReservationStatus = vehicleStorage.updateReservationStatus;
  deleteVehicleReservation = vehicleStorage.deleteVehicleReservation;
  checkVehicleAvailability = vehicleStorage.checkVehicleAvailability;
  getVehicleCheckOutLogs = vehicleStorage.getVehicleCheckOutLogs;
  getVehicleCheckOutLog = vehicleStorage.getVehicleCheckOutLog;
  getCheckOutLogByReservation = vehicleStorage.getCheckOutLogByReservation;
  createVehicleCheckOutLog = vehicleStorage.createVehicleCheckOutLog;
  deleteVehicleCheckOutLog = vehicleStorage.deleteVehicleCheckOutLog;
  getVehicleCheckInLogs = vehicleStorage.getVehicleCheckInLogs;
  getVehicleCheckInLog = vehicleStorage.getVehicleCheckInLog;
  getCheckInLogByCheckOut = vehicleStorage.getCheckInLogByCheckOut;
  createVehicleCheckInLog = vehicleStorage.createVehicleCheckInLog;
  updateVehicleCheckInLog = vehicleStorage.updateVehicleCheckInLog;
  deleteVehicleCheckInLog = vehicleStorage.deleteVehicleCheckInLog;
  getVehicleMaintenanceSchedules = vehicleStorage.getVehicleMaintenanceSchedules;
  getVehicleMaintenanceSchedule = vehicleStorage.getVehicleMaintenanceSchedule;
  createVehicleMaintenanceSchedule = vehicleStorage.createVehicleMaintenanceSchedule;
  updateVehicleMaintenanceSchedule = vehicleStorage.updateVehicleMaintenanceSchedule;
  deleteVehicleMaintenanceSchedule = vehicleStorage.deleteVehicleMaintenanceSchedule;
  getVehicleMaintenanceLogs = vehicleStorage.getVehicleMaintenanceLogs;
  getVehicleMaintenanceLogByTaskId = vehicleStorage.getVehicleMaintenanceLogByTaskId;
  createVehicleMaintenanceLog = vehicleStorage.createVehicleMaintenanceLog;
  deleteVehicleMaintenanceLog = vehicleStorage.deleteVehicleMaintenanceLog;
  getVehicleDocuments = vehicleStorage.getVehicleDocuments;
  getVehicleDocument = vehicleStorage.getVehicleDocument;
  createVehicleDocument = vehicleStorage.createVehicleDocument;
  updateVehicleDocument = vehicleStorage.updateVehicleDocument;
  deleteVehicleDocument = vehicleStorage.deleteVehicleDocument;
  getExpiringDocuments = vehicleStorage.getExpiringDocuments;
  markDocumentReminderSent = vehicleStorage.markDocumentReminderSent;

  createMessage = messagingStorage.createMessage;
  getMessagesByRequest = messagingStorage.getMessagesByRequest;
  getMessagesByTask = messagingStorage.getMessagesByTask;
  getMessages = messagingStorage.getMessages;
  deleteMessage = messagingStorage.deleteMessage;
  markMessagesAsRead = messagingStorage.markMessagesAsRead;
  markTaskMessagesAsRead = messagingStorage.markTaskMessagesAsRead;
  getNotifications = messagingStorage.getNotifications;
  getUnreadNotificationCount = messagingStorage.getUnreadNotificationCount;
  hasNotificationForRelatedItem = messagingStorage.hasNotificationForRelatedItem;
  createNotification = messagingStorage.createNotification;
  markNotificationRead = messagingStorage.markNotificationRead;
  markAllNotificationsRead = messagingStorage.markAllNotificationsRead;
  dismissNotification = messagingStorage.dismissNotification;
  dismissAllNotifications = messagingStorage.dismissAllNotifications;
  getEmailTemplates = messagingStorage.getEmailTemplates;
  getEmailTemplate = messagingStorage.getEmailTemplate;
  getEmailTemplatesByTrigger = messagingStorage.getEmailTemplatesByTrigger;
  createEmailTemplate = messagingStorage.createEmailTemplate;
  updateEmailTemplate = messagingStorage.updateEmailTemplate;
  deleteEmailTemplate = messagingStorage.deleteEmailTemplate;
  getEmailLogs = messagingStorage.getEmailLogs;
  createEmailLog = messagingStorage.createEmailLog;
  getNotificationSettings = messagingStorage.getNotificationSettings;
  getNotificationSetting = messagingStorage.getNotificationSetting;
  upsertNotificationSetting = messagingStorage.upsertNotificationSetting;
  updateNotificationSetting = messagingStorage.updateNotificationSetting;

  getProjects = projectStorage.getProjects;
  getProject = projectStorage.getProject;
  createProject = projectStorage.createProject;
  updateProject = projectStorage.updateProject;
  deleteProject = projectStorage.deleteProject;
  getTasksByProject = projectStorage.getTasksByProject;
  getProjectComments = projectStorage.getProjectComments;
  createProjectComment = projectStorage.createProjectComment;
  deleteProjectComment = projectStorage.deleteProjectComment;
  getUploadsByProject = projectStorage.getUploadsByProject;
  getProjectTeamMembers = projectStorage.getProjectTeamMembers;
  addProjectTeamMember = projectStorage.addProjectTeamMember;
  removeProjectTeamMember = projectStorage.removeProjectTeamMember;
  updateProjectTeamMember = projectStorage.updateProjectTeamMember;
  getProjectVendors = projectStorage.getProjectVendors;
  addProjectVendor = projectStorage.addProjectVendor;
  removeProjectVendor = projectStorage.removeProjectVendor;
  updateProjectVendor = projectStorage.updateProjectVendor;
  getQuotes = projectStorage.getQuotes;
  getQuote = projectStorage.getQuote;
  getQuotesByTaskId = projectStorage.getQuotesByTaskId;
  createQuote = projectStorage.createQuote;
  updateQuote = projectStorage.updateQuote;
  deleteQuote = projectStorage.deleteQuote;
  getQuoteAttachment = projectStorage.getQuoteAttachment;
  getQuoteAttachments = projectStorage.getQuoteAttachments;
  createQuoteAttachment = projectStorage.createQuoteAttachment;
  deleteQuoteAttachment = projectStorage.deleteQuoteAttachment;

  createUpload = miscStorage.createUpload;
  getUploadsByRequest = miscStorage.getUploadsByRequest;
  getUploadsByTask = miscStorage.getUploadsByTask;
  getUploadsByEquipment = miscStorage.getUploadsByEquipment;
  getUploadsByVehicleCheckOutLog = miscStorage.getUploadsByVehicleCheckOutLog;
  getUploadsByVehicleCheckInLog = miscStorage.getUploadsByVehicleCheckInLog;
  getUpload = miscStorage.getUpload;
  deleteUpload = miscStorage.deleteUpload;
  getEmergencyContacts = miscStorage.getEmergencyContacts;
  getActiveEmergencyContact = miscStorage.getActiveEmergencyContact;
  getEmergencyContact = miscStorage.getEmergencyContact;
  createEmergencyContact = miscStorage.createEmergencyContact;
  updateEmergencyContact = miscStorage.updateEmergencyContact;
  deleteEmergencyContact = miscStorage.deleteEmergencyContact;
  setActiveEmergencyContact = miscStorage.setActiveEmergencyContact;
  clearActiveEmergencyContact = miscStorage.clearActiveEmergencyContact;
  createAiAgentLog = miscStorage.createAiAgentLog;
  getAiAgentLogs = miscStorage.getAiAgentLogs;
  updateAiAgentLog = miscStorage.updateAiAgentLog;

  getResourceCategories = resourceStorage.getResourceCategories;
  createResourceCategory = resourceStorage.createResourceCategory;
  getResourceFolders = resourceStorage.getResourceFolders;
  getAllResourceFolders = resourceStorage.getAllResourceFolders;
  getResourceFolderById = resourceStorage.getResourceFolderById;
  createResourceFolder = resourceStorage.createResourceFolder;
  updateResourceFolder = resourceStorage.updateResourceFolder;
  deleteResourceFolder = resourceStorage.deleteResourceFolder;
  getResources = resourceStorage.getResources;
  getResourceById = resourceStorage.getResourceById;
  createResource = resourceStorage.createResource;
  updateResource = resourceStorage.updateResource;
  deleteResource = resourceStorage.deleteResource;
  getPropertyResources = resourceStorage.getPropertyResources;
  getEquipmentResources = resourceStorage.getEquipmentResources;
}

export const storage = new DatabaseStorage();
