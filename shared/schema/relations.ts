import { relations } from "drizzle-orm";

import { users, availabilitySchedules, userSkills } from "./users";
import { properties, spaces, equipment } from "./facilities";
import { areas, subdivisions, serviceRequests } from "./serviceRequests";
import { vendors } from "./vendors";
import {
  tasks, timeEntries, taskNotes, taskChecklistGroups, taskChecklistItems,
  taskHelpers, vehicleMaintenanceLogs, checklistTemplates,
} from "./workOrders";
import {
  vehicles, vehicleReservations, vehicleCheckOutLogs, vehicleCheckInLogs,
  vehicleMaintenanceSchedules, vehicleDocuments,
} from "./vehicles";
import { inventoryItems, partsUsed } from "./inventory";
import { messages, notifications } from "./messaging";
import { uploads, emergencyContacts } from "./misc";
import {
  projects, projectTeamMembers, projectVendors, quotes, quoteAttachments,
} from "./projects";

export const usersRelations = relations(users, ({ many }) => ({
  requestsCreated: many(serviceRequests, { relationName: "requester" }),
  tasksCreated: many(tasks, { relationName: "task_creator" }),
  tasksAssigned: many(tasks, { relationName: "task_assignee" }),
  timeEntries: many(timeEntries),
  messages: many(messages),
  taskNotes: many(taskNotes),
  uploads: many(uploads),
  vehicleReservations: many(vehicleReservations),
  vehicleCheckOutLogs: many(vehicleCheckOutLogs),
  vehicleCheckInLogs: many(vehicleCheckInLogs),
  taskHelperships: many(taskHelpers),
}));

export const areasRelations = relations(areas, ({ many }) => ({
  subdivisions: many(subdivisions),
  serviceRequests: many(serviceRequests),
  tasks: many(tasks),
}));

export const subdivisionsRelations = relations(subdivisions, ({ one, many }) => ({
  area: one(areas, {
    fields: [subdivisions.areaId],
    references: [areas.id],
  }),
  parent: one(subdivisions, {
    fields: [subdivisions.parentId],
    references: [subdivisions.id],
    relationName: "subdivision_parent",
  }),
  children: many(subdivisions, { relationName: "subdivision_parent" }),
  serviceRequests: many(serviceRequests),
  tasks: many(tasks),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  requester: one(users, {
    fields: [serviceRequests.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  property: one(properties, {
    fields: [serviceRequests.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [serviceRequests.spaceId],
    references: [spaces.id],
  }),
  area: one(areas, {
    fields: [serviceRequests.areaId],
    references: [areas.id],
  }),
  subdivision: one(subdivisions, {
    fields: [serviceRequests.subdivisionId],
    references: [subdivisions.id],
  }),
  tasks: many(tasks),
  messages: many(messages),
  uploads: many(uploads),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  request: one(serviceRequests, {
    fields: [tasks.requestId],
    references: [serviceRequests.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [tasks.spaceId],
    references: [spaces.id],
  }),
  equipment: one(equipment, {
    fields: [tasks.equipmentId],
    references: [equipment.id],
  }),
  vehicle: one(vehicles, {
    fields: [tasks.vehicleId],
    references: [vehicles.id],
  }),
  creator: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "task_creator",
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "task_assignee",
  }),
  assignedVendor: one(vendors, {
    fields: [tasks.assignedVendorId],
    references: [vendors.id],
  }),
  area: one(areas, {
    fields: [tasks.areaId],
    references: [areas.id],
  }),
  subdivision: one(subdivisions, {
    fields: [tasks.subdivisionId],
    references: [subdivisions.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "task_subtasks",
  }),
  subTasks: many(tasks, { relationName: "task_subtasks" }),
  timeEntries: many(timeEntries),
  partsUsed: many(partsUsed),
  messages: many(messages),
  taskNotes: many(taskNotes),
  uploads: many(uploads),
  checklistGroups: many(taskChecklistGroups),
  helpers: many(taskHelpers),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
}));

export const partsUsedRelations = relations(partsUsed, ({ one }) => ({
  task: one(tasks, {
    fields: [partsUsed.taskId],
    references: [tasks.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [partsUsed.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id],
  }),
  request: one(serviceRequests, {
    fields: [messages.requestId],
    references: [serviceRequests.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
  task: one(tasks, {
    fields: [uploads.taskId],
    references: [tasks.id],
  }),
  request: one(serviceRequests, {
    fields: [uploads.requestId],
    references: [serviceRequests.id],
  }),
  equipment: one(equipment, {
    fields: [uploads.equipmentId],
    references: [equipment.id],
  }),
  vehicleCheckOutLog: one(vehicleCheckOutLogs, {
    fields: [uploads.vehicleCheckOutLogId],
    references: [vehicleCheckOutLogs.id],
  }),
  vehicleCheckInLog: one(vehicleCheckInLogs, {
    fields: [uploads.vehicleCheckInLogId],
    references: [vehicleCheckInLogs.id],
  }),
  uploadedBy: one(users, {
    fields: [uploads.uploadedById],
    references: [users.id],
  }),
}));

export const taskNotesRelations = relations(taskNotes, ({ one }) => ({
  task: one(tasks, {
    fields: [taskNotes.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskNotes.userId],
    references: [users.id],
  }),
}));

export const taskChecklistGroupsRelations = relations(taskChecklistGroups, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskChecklistGroups.taskId],
    references: [tasks.id],
  }),
  items: many(taskChecklistItems),
}));

export const taskChecklistItemsRelations = relations(taskChecklistItems, ({ one }) => ({
  group: one(taskChecklistGroups, {
    fields: [taskChecklistItems.groupId],
    references: [taskChecklistGroups.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
  spaces: many(spaces),
  equipment: many(equipment),
  tasks: many(tasks),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  property: one(properties, {
    fields: [spaces.propertyId],
    references: [properties.id],
  }),
  equipment: many(equipment),
  tasks: many(tasks),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  property: one(properties, {
    fields: [equipment.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [equipment.spaceId],
    references: [spaces.id],
  }),
  uploads: many(uploads),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  reservations: many(vehicleReservations),
  checkOutLogs: many(vehicleCheckOutLogs),
  checkInLogs: many(vehicleCheckInLogs),
  maintenanceSchedules: many(vehicleMaintenanceSchedules),
  maintenanceLogs: many(vehicleMaintenanceLogs),
  documents: many(vehicleDocuments),
  tasks: many(tasks),
}));

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleDocuments.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleReservationsRelations = relations(vehicleReservations, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleReservations.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleReservations.userId],
    references: [users.id],
  }),
  checkOutLogs: many(vehicleCheckOutLogs),
}));

export const vehicleCheckOutLogsRelations = relations(vehicleCheckOutLogs, ({ one, many }) => ({
  reservation: one(vehicleReservations, {
    fields: [vehicleCheckOutLogs.reservationId],
    references: [vehicleReservations.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleCheckOutLogs.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleCheckOutLogs.userId],
    references: [users.id],
  }),
  checkInLog: one(vehicleCheckInLogs),
  uploads: many(uploads),
}));

export const vehicleCheckInLogsRelations = relations(vehicleCheckInLogs, ({ one, many }) => ({
  checkOutLog: one(vehicleCheckOutLogs, {
    fields: [vehicleCheckInLogs.checkOutLogId],
    references: [vehicleCheckOutLogs.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleCheckInLogs.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleCheckInLogs.userId],
    references: [users.id],
  }),
  uploads: many(uploads),
}));

export const vehicleMaintenanceSchedulesRelations = relations(vehicleMaintenanceSchedules, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenanceSchedules.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleMaintenanceLogsRelations = relations(vehicleMaintenanceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenanceLogs.vehicleId],
    references: [vehicles.id],
  }),
  task: one(tasks, {
    fields: [vehicleMaintenanceLogs.taskId],
    references: [tasks.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  tasks: many(tasks),
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  assignedBy: one(users, {
    fields: [emergencyContacts.assignedById],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  property: one(properties, {
    fields: [projects.propertyId],
    references: [properties.id],
  }),
  area: one(areas, {
    fields: [projects.areaId],
    references: [areas.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  teamMembers: many(projectTeamMembers),
  projectVendors: many(projectVendors),
  tasks: many(tasks),
}));

export const projectTeamMembersRelations = relations(projectTeamMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectTeamMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectTeamMembers.userId],
    references: [users.id],
  }),
}));

export const projectVendorsRelations = relations(projectVendors, ({ one }) => ({
  project: one(projects, {
    fields: [projectVendors.projectId],
    references: [projects.id],
  }),
  vendor: one(vendors, {
    fields: [projectVendors.vendorId],
    references: [vendors.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  task: one(tasks, {
    fields: [quotes.taskId],
    references: [tasks.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdById],
    references: [users.id],
  }),
  attachments: many(quoteAttachments),
}));

export const quoteAttachmentsRelations = relations(quoteAttachments, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteAttachments.quoteId],
    references: [quotes.id],
  }),
}));

export const taskHelpersRelations = relations(taskHelpers, ({ one }) => ({
  task: one(tasks, {
    fields: [taskHelpers.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskHelpers.userId],
    references: [users.id],
  }),
}));
