import {
  messages,
  notifications,
  emailTemplates,
  emailLogs,
  notificationSettings,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailLog,
  type InsertEmailLog,
  type NotificationSetting,
  type InsertNotificationSetting,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, or, ne, desc, isNull, sql } from "drizzle-orm";

export async function createMessage(messageData: InsertMessage): Promise<Message> {
  const [message] = await db.insert(messages).values(messageData).returning();
  return message;
}

export async function getMessagesByRequest(requestId: string): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.requestId, requestId))
    .orderBy(messages.createdAt);
}

export async function getMessagesByTask(taskId: string): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.taskId, taskId))
    .orderBy(messages.createdAt);
}

export async function getMessages(): Promise<Message[]> {
  return await db.select().from(messages).orderBy(desc(messages.createdAt));
}

export async function deleteMessage(id: string): Promise<void> {
  await db.delete(messages).where(eq(messages.id, id));
}

export async function markMessagesAsRead(requestId: string, userId: string): Promise<void> {
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

export async function markTaskMessagesAsRead(taskId: string, userId: string): Promise<void> {
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

export async function getNotifications(userId?: string): Promise<Notification[]> {
  if (userId) {
    return await db
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
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.isDismissed, false))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadNotificationCount(userId?: string): Promise<number> {
  const result = await db
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

export async function hasNotificationForRelatedItem(relatedId: string, type: string): Promise<boolean> {
  const result = await db
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

export async function createNotification(notification: InsertNotification): Promise<Notification> {
  const [created] = await db
    .insert(notifications)
    .values(notification)
    .returning();
  return created;
}

export async function markNotificationRead(id: string): Promise<Notification | undefined> {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
    .returning();
  return updated;
}

export async function markAllNotificationsRead(userId?: string): Promise<void> {
  if (userId) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        or(eq(notifications.userId, userId), isNull(notifications.userId))
      );
  } else {
    await db.update(notifications).set({ isRead: true });
  }
}

export async function dismissNotification(id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isDismissed: true })
    .where(eq(notifications.id, id));
}

export async function dismissAllNotifications(userId?: string): Promise<void> {
  if (userId) {
    await db
      .update(notifications)
      .set({ isDismissed: true })
      .where(
        or(eq(notifications.userId, userId), isNull(notifications.userId))
      );
  } else {
    await db.update(notifications).set({ isDismissed: true });
  }
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return await db.select().from(emailTemplates).orderBy(emailTemplates.name);
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
  const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
  return template;
}

export async function getEmailTemplatesByTrigger(trigger: string): Promise<EmailTemplate[]> {
  return await db.select().from(emailTemplates).where(eq(emailTemplates.trigger, trigger));
}

export async function createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
  const [created] = await db
    .insert(emailTemplates)
    .values(template)
    .returning();
  return created;
}

export async function updateEmailTemplate(id: string, data: { subject?: string; body?: string; name?: string }): Promise<EmailTemplate | undefined> {
  const [updated] = await db
    .update(emailTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emailTemplates.id, id))
    .returning();
  return updated;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await db.delete(emailTemplates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.isCustom, true)));
}

export async function getEmailLogs(filters?: { templateType?: string; status?: string; search?: string }): Promise<EmailLog[]> {
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

  const query = db.select().from(emailLogs);
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(emailLogs.sentAt)).limit(200);
  }
  return await query.orderBy(desc(emailLogs.sentAt)).limit(200);
}

export async function createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
  const [created] = await db.insert(emailLogs).values(log).returning();
  return created;
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  return await db.select().from(notificationSettings).orderBy(notificationSettings.label);
}

export async function getNotificationSetting(type: string): Promise<NotificationSetting | undefined> {
  const [setting] = await db.select().from(notificationSettings).where(eq(notificationSettings.type, type));
  return setting;
}

export async function upsertNotificationSetting(setting: InsertNotificationSetting): Promise<NotificationSetting> {
  const [created] = await db
    .insert(notificationSettings)
    .values(setting)
    .onConflictDoUpdate({
      target: notificationSettings.type,
      set: { ...setting, updatedAt: new Date() },
    })
    .returning();
  return created;
}

export async function updateNotificationSetting(id: string, data: { emailEnabled?: boolean; inAppEnabled?: boolean }): Promise<NotificationSetting | undefined> {
  const [updated] = await db
    .update(notificationSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notificationSettings.id, id))
    .returning();
  return updated;
}
