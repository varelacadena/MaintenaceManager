import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin, requireTechnicianOrAdmin, getCurrentUser, canAccessTask } from "../middleware";
import { handleRouteError, getAuthUser, syncProjectStatusFromTasks } from "../routeUtils";
import {
  insertProjectSchema,
  insertProjectTeamMemberSchema,
  insertProjectVendorSchema,
  insertQuoteSchema,
  insertEmergencyContactSchema,
} from "@shared/schema";
import { z } from "zod";

export function registerProjectRoutes(app: Express) {
  // ===================== Emergency Contact Routes =====================
  
  app.get("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contacts = await storage.getEmergencyContacts();
      res.json(contacts);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch emergency contacts");
    }
  });

  app.get("/api/emergency-contacts/active", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getActiveEmergencyContact();
      res.json(contact || null);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch active emergency contact");
    }
  });

  app.get("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.getEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch emergency contact");
    }
  });

  app.post("/api/emergency-contacts", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertEmergencyContactSchema.parse({
        ...req.body,
        assignedById: req.userId,
      });
      
      const contact = await storage.createEmergencyContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to create emergency contact");
    }
  });

  app.patch("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertEmergencyContactSchema.partial().parse(req.body);
      const contact = await storage.updateEmergencyContact(req.params.id, validated);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to update emergency contact");
    }
  });

  app.post("/api/emergency-contacts/:id/activate", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const contact = await storage.setActiveEmergencyContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      handleRouteError(res, error, "Failed to activate emergency contact");
    }
  });

  app.post("/api/emergency-contacts/clear-active", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.clearActiveEmergencyContact();
      res.json({ message: "Active emergency contact cleared" });
    } catch (error) {
      handleRouteError(res, error, "Failed to clear active emergency contact");
    }
  });

  app.delete("/api/emergency-contacts/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEmergencyContact(req.params.id);
      res.json({ message: "Emergency contact deleted" });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete emergency contact");
    }
  });

  // ============== NOTIFICATIONS ==============

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const notifications = await storage.getNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch notifications");
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch notification count");
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      handleRouteError(res, error, "Failed to mark notification as read");
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await storage.markAllNotificationsRead(user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      handleRouteError(res, error, "Failed to mark all notifications as read");
    }
  });

  app.post("/api/notifications/:id/dismiss", isAuthenticated, async (req, res) => {
    try {
      await storage.dismissNotification(req.params.id);
      res.json({ message: "Notification dismissed" });
    } catch (error) {
      handleRouteError(res, error, "Failed to dismiss notification");
    }
  });

  app.post("/api/notifications/dismiss-all", isAuthenticated, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await storage.dismissAllNotifications(user.id);
      res.json({ message: "All notifications dismissed" });
    } catch (error) {
      handleRouteError(res, error, "Failed to dismiss all notifications");
    }
  });

  // ============== PROJECT MANAGEMENT ==============

  app.get("/api/projects", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, createdById } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (createdById) filters.createdById = createdById as string;
      
      const projectList = await storage.getProjects(filters);
      res.json(projectList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch projects");
    }
  });

  app.get("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project");
    }
  });

  app.post("/api/projects", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      const body = { ...req.body };
      if (body.startDate && typeof body.startDate === "string") {
        body.startDate = new Date(body.startDate);
      }
      if (body.targetEndDate && typeof body.targetEndDate === "string") {
        body.targetEndDate = new Date(body.targetEndDate);
      }
      const data = insertProjectSchema.parse({
        ...body,
        createdById: userId,
      });
      
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      handleRouteError(res, error, "Failed to create project");
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const rawBody = { ...req.body };
      if (rawBody.startDate && typeof rawBody.startDate === "string") {
        rawBody.startDate = new Date(rawBody.startDate);
      }
      if (rawBody.targetEndDate && typeof rawBody.targetEndDate === "string") {
        rawBody.targetEndDate = new Date(rawBody.targetEndDate);
      }
      const validated = insertProjectSchema.partial().parse(rawBody);
      const body: any = { ...validated };
      const project = await storage.updateProject(req.params.id, body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      handleRouteError(res, error, "Failed to update project");
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete project");
    }
  });

  app.get("/api/projects/:id/tasks", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const tasksList = await storage.getTasksByProject(req.params.id);
      res.json(tasksList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project tasks");
    }
  });

  // ============== PROJECT TEAM MEMBERS ==============

  app.get("/api/projects/:id/team", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const members = await storage.getProjectTeamMembers(req.params.id);
      res.json(members);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch team members");
    }
  });

  app.post("/api/projects/:id/team", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertProjectTeamMemberSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });
      const member = await storage.addProjectTeamMember(data);
      res.status(201).json(member);
    } catch (error) {
      handleRouteError(res, error, "Failed to add team member");
    }
  });

  app.patch("/api/project-team-members/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertProjectTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateProjectTeamMember(req.params.id, validated);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      handleRouteError(res, error, "Failed to update team member");
    }
  });

  app.delete("/api/project-team-members/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.removeProjectTeamMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to remove team member");
    }
  });

  // ============== PROJECT VENDORS ==============

  app.get("/api/projects/:id/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const vendorList = await storage.getProjectVendors(req.params.id);
      res.json(vendorList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project vendors");
    }
  });

  app.post("/api/projects/:id/vendors", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const data = insertProjectVendorSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });
      const vendor = await storage.addProjectVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      handleRouteError(res, error, "Failed to add vendor to project");
    }
  });

  app.patch("/api/project-vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validated = insertProjectVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateProjectVendor(req.params.id, validated);
      if (!vendor) {
        return res.status(404).json({ message: "Project vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      handleRouteError(res, error, "Failed to update project vendor");
    }
  });

  app.delete("/api/project-vendors/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.removeProjectVendor(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to remove vendor");
    }
  });

  // ============== QUOTES (Internal Estimates) ==============

  app.get("/api/quotes", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { taskId, status } = req.query;
      const filters: any = {};
      if (taskId) filters.taskId = taskId as string;
      if (status) filters.status = status as string;
      
      const quoteList = await storage.getQuotes(filters);
      res.json(quoteList);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch quotes");
    }
  });

  app.get("/api/tasks/:taskId/quotes", isAuthenticated, async (req, res) => {
    try {
      const quotes = await storage.getQuotesByTaskId(req.params.taskId);
      res.json(quotes);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch quotes");
    }
  });

  app.get("/api/quotes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch quote");
    }
  });

  app.post("/api/quotes", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (user.role === "technician" && req.body.taskId) {
        const hasAccess = await canAccessTask(user.id, req.body.taskId);
        if (!hasAccess) {
          return res.status(403).json({ message: "You can only add estimates to tasks assigned to you" });
        }
      }
      
      const data = insertQuoteSchema.parse({
        ...req.body,
        createdById: user.id,
      });
      
      const quote = await storage.createQuote(data);
      
      if (req.body.taskId) {
        const task = await storage.getTask(req.body.taskId);
        if (task && task.requiresEstimate && task.estimateStatus === "needs_estimate") {
          await storage.updateTask(req.body.taskId, {
            estimateStatus: "waiting_approval",
            status: "waiting_approval",
          });
        }
      }
      
      res.status(201).json(quote);
    } catch (error) {
      handleRouteError(res, error, "Failed to create quote");
    }
  });

  app.patch("/api/quotes/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only edit your own estimates" });
      }

      const validated = insertQuoteSchema.partial().parse(req.body);
      let updateData: any = validated;
      if (user.role === "technician") {
        const { status, taskId, createdById, ...safeFields } = updateData;
        updateData = safeFields;
      }

      const updated = await storage.updateQuote(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update quote");
    }
  });

  app.post("/api/quotes/:id/approve", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const approvedQuote = await storage.updateQuote(req.params.id, { status: "approved" });

      const taskQuotes = await storage.getQuotesByTaskId(quote.taskId);
      for (const q of taskQuotes) {
        if (q.id !== req.params.id && q.status !== "rejected") {
          await storage.updateQuote(q.id, { status: "rejected" });
        }
      }

      const currentTask = await storage.getTask(quote.taskId);
      const keepStatus = currentTask && (currentTask.status === "in_progress" || currentTask.status === "on_hold")
        ? currentTask.status
        : "not_started";
      const updatedQuoteTask = await storage.updateTask(quote.taskId, {
        status: keepStatus,
        estimateStatus: "approved",
        approvedQuoteId: req.params.id,
      });

      if (updatedQuoteTask?.projectId) {
        await syncProjectStatusFromTasks(updatedQuoteTask.projectId);
      }

      res.json(approvedQuote);
    } catch (error) {
      handleRouteError(res, error, "Failed to approve quote");
    }
  });

  app.post("/api/quotes/:id/reject", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (quote.status === "approved") {
        return res.status(400).json({ message: "Cannot reject an already approved estimate" });
      }

      if (quote.status === "rejected") {
        return res.status(400).json({ message: "Estimate is already rejected" });
      }

      const rejectedQuote = await storage.updateQuote(req.params.id, { status: "rejected" });

      const taskQuotes = await storage.getQuotesByTaskId(quote.taskId);
      const allRejected = taskQuotes.every(q => q.id === req.params.id ? true : q.status === "rejected");

      if (allRejected) {
        await storage.updateTask(quote.taskId, {
          estimateStatus: "needs_estimate",
          status: "in_progress",
        });
      }

      res.json(rejectedQuote);
    } catch (error) {
      handleRouteError(res, error, "Failed to reject quote");
    }
  });

  app.delete("/api/quotes/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only delete your own estimates" });
      }

      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete quote");
    }
  });

  // ============== QUOTE ATTACHMENTS ==============

  app.get("/api/quotes/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const attachments = await storage.getQuoteAttachments(req.params.id);
      res.json(attachments);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch attachments");
    }
  });

  app.post("/api/quotes/:id/attachments", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      if (user.role === "technician" && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only add attachments to your own estimates" });
      }

      const attachment = await storage.createQuoteAttachment({
        quoteId: req.params.id,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
        fileSize: req.body.fileSize,
        storageUrl: req.body.storageUrl,
      });
      res.status(201).json(attachment);
    } catch (error) {
      handleRouteError(res, error, "Failed to create attachment");
    }
  });

  app.delete("/api/quote-attachments/:id", isAuthenticated, requireTechnicianOrAdmin, async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const attachment = await storage.getQuoteAttachment(req.params.id);
      if (!attachment) return res.status(404).json({ message: "Attachment not found" });

      const quote = await storage.getQuote(attachment.quoteId);
      if (user.role === "technician" && quote && quote.createdById !== user.id) {
        return res.status(403).json({ message: "You can only delete attachments from your own estimates" });
      }

      await storage.deleteQuoteAttachment(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "Failed to delete attachment");
    }
  });

  // ============== PROJECT ANALYTICS ==============

  app.get("/api/projects/:id/analytics", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const projectTasks = await storage.getTasksByProject(projectId);
      
      const taskStats = {
        total: projectTasks.length,
        completed: projectTasks.filter(t => t.status === "completed").length,
        inProgress: projectTasks.filter(t => t.status === "in_progress").length,
        notStarted: projectTasks.filter(t => t.status === "not_started").length,
        onHold: projectTasks.filter(t => t.status === "on_hold").length,
      };

      const team = await storage.getProjectTeamMembers(projectId);
      const vendorLinks = await storage.getProjectVendors(projectId);

      let quotedAmount = 0;
      let totalQuotes = 0;
      let approvedQuotes = 0;
      let draftQuotes = 0;

      let actualPartsCost = 0;
      let totalTimeMinutes = 0;
      
      for (const task of projectTasks) {
        const parts = await storage.getPartsByTask(task.id);
        actualPartsCost += parts.reduce((sum, p) => sum + (p.cost || 0), 0);
        
        const timeEntries = await storage.getTimeEntriesByTask(task.id);
        totalTimeMinutes += timeEntries.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
        
        const taskQuotes = await storage.getQuotesByTaskId(task.id);
        totalQuotes += taskQuotes.length;
        approvedQuotes += taskQuotes.filter(q => q.status === "approved").length;
        draftQuotes += taskQuotes.filter(q => q.status === "draft").length;
        quotedAmount += taskQuotes.filter(q => q.status === "approved").reduce((sum, q) => sum + (q.estimatedCost || 0), 0);
      }

      res.json({
        project,
        taskStats,
        teamCount: team.length,
        vendorCount: vendorLinks.length,
        budget: {
          allocated: project.budgetAmount || 0,
          quoted: quotedAmount,
          actualParts: actualPartsCost,
          remaining: (project.budgetAmount || 0) - actualPartsCost - quotedAmount,
        },
        time: {
          totalMinutes: totalTimeMinutes,
          totalHours: Math.round(totalTimeMinutes / 60 * 10) / 10,
        },
        quotes: {
          total: totalQuotes,
          approved: approvedQuotes,
          pending: draftQuotes,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch project analytics");
    }
  });

  // ============== EMAIL MANAGEMENT ==============

  app.get("/api/email-templates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch email templates");
    }
  });

  app.post("/api/email-templates", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { name, trigger, subject, body } = req.body;
      if (!name || !trigger || !subject || !body) {
        return res.status(400).json({ message: "name, trigger, subject, and body are required" });
      }
      const TRIGGER_VARIABLES: Record<string, string[]> = {
        new_service_request: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
        new_vehicle_reservation: ["{{requester_name}}", "{{vehicle_name}}", "{{purpose}}", "{{start_date}}", "{{end_date}}"],
        vehicle_reservation_approved: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{purpose}}"],
        vehicle_reservation_denied: ["{{vehicle_name}}", "{{start_date}}", "{{end_date}}", "{{requester_name}}"],
        task_created: ["{{requester_name}}", "{{request_title}}", "{{request_description}}", "{{urgency}}"],
        task_assigned: ["{{request_title}}", "{{request_description}}", "{{urgency}}"],
        status_change: ["{{request_title}}", "{{status_message}}", "{{old_status}}", "{{new_status}}"],
        task_reminder: ["{{task_name}}", "{{task_status}}", "{{due_date}}"],
        document_expiration: ["{{document_name}}", "{{vehicle_name}}", "{{expiration_date}}"],
      };
      const template = await storage.createEmailTemplate({
        type: `custom_${Date.now()}`,
        trigger,
        name,
        subject,
        body,
        availableVariables: TRIGGER_VARIABLES[trigger] || [],
        isCustom: true,
      });
      res.status(201).json(template);
    } catch (error) {
      handleRouteError(res, error, "Failed to create email template");
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const emailTemplateUpdateSchema = z.object({
        subject: z.string().optional(),
        body: z.string().optional(),
        name: z.string().optional(),
      });
      const { subject, body, name } = emailTemplateUpdateSchema.parse(req.body);
      const template = await storage.updateEmailTemplate(req.params.id, { subject, body, name });
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      handleRouteError(res, error, "Failed to update email template");
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (!template.isCustom) {
        return res.status(403).json({ message: "Cannot delete built-in templates" });
      }
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete email template");
    }
  });

  app.get("/api/email-logs", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { templateType, status, search } = req.query;
      const logs = await storage.getEmailLogs({
        templateType: templateType as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      });
      res.json(logs);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch email logs");
    }
  });

  app.get("/api/notification-settings", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch notification settings");
    }
  });

  app.patch("/api/notification-settings/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const notifSettingSchema = z.object({
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
      });
      const { emailEnabled, inAppEnabled } = notifSettingSchema.parse(req.body);
      const setting = await storage.updateNotificationSetting(req.params.id, { emailEnabled, inAppEnabled });
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      handleRouteError(res, error, "Failed to update notification setting");
    }
  });
}
