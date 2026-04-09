import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireAdmin } from "../middleware";
import { handleRouteError } from "../routeUtils";
import { z } from "zod";

export function registerEmailRoutes(app: Express) {
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
}
