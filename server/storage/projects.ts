import {
  projects,
  projectComments,
  projectTeamMembers,
  projectVendors,
  quotes,
  quoteAttachments,
  uploads,
  tasks,
  type Project,
  type InsertProject,
  type ProjectComment,
  type InsertProjectComment,
  type ProjectTeamMember,
  type InsertProjectTeamMember,
  type ProjectVendor,
  type InsertProjectVendor,
  type Quote,
  type InsertQuote,
  type QuoteAttachment,
  type InsertQuoteAttachment,
  type Upload,
  type Task,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

export async function getProjects(filters?: { status?: string; createdById?: string }): Promise<Project[]> {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(projects.status, filters.status as any));
  }
  if (filters?.createdById) {
    conditions.push(eq(projects.createdById, filters.createdById));
  }

  const query = db.select().from(projects);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(projects.createdAt));
  }
  return await query.orderBy(desc(projects.createdAt));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

export async function createProject(projectData: InsertProject): Promise<Project> {
  const [project] = await db.insert(projects).values(projectData).returning();
  return project;
}

export async function updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.initialDate));
}

export async function getProjectComments(projectId: string): Promise<ProjectComment[]> {
  return await db
    .select()
    .from(projectComments)
    .where(eq(projectComments.projectId, projectId))
    .orderBy(projectComments.createdAt);
}

export async function createProjectComment(commentData: InsertProjectComment): Promise<ProjectComment> {
  const [comment] = await db.insert(projectComments).values(commentData).returning();
  return comment;
}

export async function deleteProjectComment(id: string): Promise<void> {
  await db.delete(projectComments).where(eq(projectComments.id, id));
}

export async function getUploadsByProject(projectId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.projectId, projectId))
    .orderBy(desc(uploads.createdAt));
}

export async function getProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
  return await db
    .select()
    .from(projectTeamMembers)
    .where(eq(projectTeamMembers.projectId, projectId));
}

export async function addProjectTeamMember(member: InsertProjectTeamMember): Promise<ProjectTeamMember> {
  const [result] = await db.insert(projectTeamMembers).values(member).returning();
  return result;
}

export async function removeProjectTeamMember(id: string): Promise<void> {
  await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, id));
}

export async function updateProjectTeamMember(id: string, data: Partial<InsertProjectTeamMember>): Promise<ProjectTeamMember | undefined> {
  const [result] = await db
    .update(projectTeamMembers)
    .set(data)
    .where(eq(projectTeamMembers.id, id))
    .returning();
  return result;
}

export async function getProjectVendors(projectId: string): Promise<ProjectVendor[]> {
  return await db
    .select()
    .from(projectVendors)
    .where(eq(projectVendors.projectId, projectId));
}

export async function addProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor> {
  const [result] = await db.insert(projectVendors).values(vendor).returning();
  return result;
}

export async function removeProjectVendor(id: string): Promise<void> {
  await db.delete(projectVendors).where(eq(projectVendors.id, id));
}

export async function updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined> {
  const [result] = await db
    .update(projectVendors)
    .set(data)
    .where(eq(projectVendors.id, id))
    .returning();
  return result;
}

export async function getQuotes(filters?: { taskId?: string; status?: string }): Promise<Quote[]> {
  const conditions = [];
  if (filters?.taskId) {
    conditions.push(eq(quotes.taskId, filters.taskId));
  }
  if (filters?.status) {
    conditions.push(eq(quotes.status, filters.status as any));
  }

  const query = db.select().from(quotes);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(quotes.createdAt));
  }
  return await query.orderBy(desc(quotes.createdAt));
}

export async function getQuote(id: string): Promise<Quote | undefined> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
  return quote;
}

export async function getQuotesByTaskId(taskId: string): Promise<Quote[]> {
  return await db
    .select()
    .from(quotes)
    .where(eq(quotes.taskId, taskId))
    .orderBy(desc(quotes.createdAt));
}

export async function createQuote(quoteData: InsertQuote): Promise<Quote> {
  const [quote] = await db.insert(quotes).values(quoteData).returning();
  return quote;
}

export async function updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
  const [quote] = await db
    .update(quotes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(quotes.id, id))
    .returning();
  return quote;
}

export async function deleteQuote(id: string): Promise<void> {
  await db.delete(quotes).where(eq(quotes.id, id));
}

export async function getQuoteAttachment(id: string): Promise<QuoteAttachment | undefined> {
  const [result] = await db
    .select()
    .from(quoteAttachments)
    .where(eq(quoteAttachments.id, id));
  return result;
}

export async function getQuoteAttachments(quoteId: string): Promise<QuoteAttachment[]> {
  return await db
    .select()
    .from(quoteAttachments)
    .where(eq(quoteAttachments.quoteId, quoteId));
}

export async function createQuoteAttachment(attachment: InsertQuoteAttachment): Promise<QuoteAttachment> {
  const [result] = await db.insert(quoteAttachments).values(attachment).returning();
  return result;
}

export async function deleteQuoteAttachment(id: string): Promise<void> {
  await db.delete(quoteAttachments).where(eq(quoteAttachments.id, id));
}
