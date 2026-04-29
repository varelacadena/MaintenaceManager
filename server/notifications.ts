import { Resend } from 'resend';
import { storage } from './storage';
import type { User, ServiceRequest, VehicleReservation } from "@shared/schema";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Not specified";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString();
}

function getCredentials() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Resend API key env var is not set.");
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  return { apiKey, fromEmail };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}

async function isEmailEnabled(type: string): Promise<boolean> {
  try {
    const setting = await storage.getNotificationSetting(type);
    return setting ? setting.emailEnabled : true;
  } catch {
    return true;
  }
}

async function getTemplatesForTrigger(trigger: string): Promise<{ subject: string; body: string }[]> {
  try {
    const templates = await storage.getEmailTemplatesByTrigger(trigger);
    return templates.map(t => ({ subject: t.subject, body: t.body }));
  } catch {
    return [];
  }
}

async function logEmail(
  templateType: string,
  recipientEmail: string,
  recipientName: string | null,
  subject: string,
  body: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string
): Promise<void> {
  try {
    await storage.createEmailLog({
      templateType,
      recipientEmail,
      recipientName,
      subject,
      body,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (err) {
    console.error("[EMAIL LOG] Failed to log email:", err);
  }
}

export interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

class ProductionNotificationService implements NotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const { client, fromEmail } = await getUncachableResendClient();

      const { error } = await client.emails.send({
        from: fromEmail,
        to,
        subject,
        text: body
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }
      console.log(`[EMAIL] Sent via Resend to ${to}: ${subject}`);
    } catch (error) {
      console.error(`[EMAIL] Failed to send email to ${to} (subject: "${subject}"):`, error);
      console.log(`[EMAIL FALLBACK] To: ${to}, Subject: ${subject}, Body: ${body}`);
      throw error;
    }
  }
}

async function sendTrackedEmail(
  ns: NotificationService,
  trigger: string,
  to: string,
  recipientName: string | null,
  fallbackSubject: string,
  fallbackBody: string,
  variables: Record<string, string>
): Promise<void> {
  const enabled = await isEmailEnabled(trigger);
  if (!enabled) {
    await logEmail(trigger, to, recipientName, fallbackSubject, fallbackBody, "skipped");
    console.log(`[EMAIL] Skipped (disabled): ${trigger} to ${to}`);
    return;
  }

  const dbTemplates = await getTemplatesForTrigger(trigger);
  const templatesToSend = dbTemplates.length > 0
    ? dbTemplates.map(t => ({
        subject: substituteVariables(t.subject, variables),
        body: substituteVariables(t.body, variables),
      }))
    : [{ subject: substituteVariables(fallbackSubject, variables), body: substituteVariables(fallbackBody, variables) }];

  for (const tmpl of templatesToSend) {
    try {
      await ns.sendEmail(to, tmpl.subject, tmpl.body);
      await logEmail(trigger, to, recipientName, tmpl.subject, tmpl.body, "sent");
    } catch (error: any) {
      await logEmail(trigger, to, recipientName, tmpl.subject, tmpl.body, "failed", error?.message || "Unknown error");
    }
  }
}

export async function notifyTaskCreated(
  request: ServiceRequest,
  requester: User,
  assignees: User[],
  notificationService: NotificationService
): Promise<void> {
  const variables: Record<string, string> = {
    '{{requester_name}}': `${requester.firstName} ${requester.lastName}`,
    '{{request_title}}': request.title,
    '{{request_description}}': request.description,
    '{{urgency}}': request.urgency,
  };

  const fallbackSubject = `New Maintenance Request: ${request.title}`;
  const fallbackBody = `A new maintenance request has been submitted by ${requester.firstName} ${requester.lastName}.\n\nTitle: ${request.title}\nDescription: ${request.description}\nUrgency: ${request.urgency}\n\nPlease review and assign this request.`;

  for (const assignee of assignees) {
    if (assignee.email) {
      await sendTrackedEmail(
        notificationService, "task_created", assignee.email,
        `${assignee.firstName} ${assignee.lastName}`,
        fallbackSubject, fallbackBody, variables
      );
    }

  }
}

export async function notifyStatusChange(
  request: ServiceRequest,
  requester: User,
  oldStatus: string,
  newStatus: string,
  notificationService: NotificationService
): Promise<void> {
  const statusMessages: Record<string, string> = {
    in_progress: "has been started and is now in progress",
    on_hold: "has been placed on hold",
    completed: "has been completed",
    pending: "is pending review"
  };

  const message = statusMessages[newStatus] || `status has changed to ${newStatus}`;

  const variables: Record<string, string> = {
    '{{request_title}}': request.title,
    '{{status_message}}': message,
    '{{old_status}}': oldStatus,
    '{{new_status}}': newStatus,
  };

  const fallbackSubject = `Status Update: ${request.title}`;
  const fallbackBody = `Your maintenance request "${request.title}" ${message}.\n\nPrevious Status: ${oldStatus}\nNew Status: ${newStatus}\n\nYou can view the details and updates in the maintenance portal.`;

  if (requester.email) {
    await sendTrackedEmail(
      notificationService, "status_change", requester.email,
      `${requester.firstName} ${requester.lastName}`,
      fallbackSubject, fallbackBody, variables
    );
  }

}

export async function notifyTaskAssigned(
  request: ServiceRequest,
  assignedTo: User,
  notificationService: NotificationService
): Promise<void> {
  const variables: Record<string, string> = {
    '{{request_title}}': request.title,
    '{{request_description}}': request.description,
    '{{urgency}}': request.urgency,
  };

  const fallbackSubject = `Task Assigned: ${request.title}`;
  const fallbackBody = `You have been assigned to work on a maintenance request.\n\nTitle: ${request.title}\nDescription: ${request.description}\nUrgency: ${request.urgency}\n\nPlease review the task details and update the status as you progress.`;

  if (assignedTo.email) {
    await sendTrackedEmail(
      notificationService, "task_assigned", assignedTo.email,
      `${assignedTo.firstName} ${assignedTo.lastName}`,
      fallbackSubject, fallbackBody, variables
    );
  }

}

export async function notifyNewServiceRequest(
  request: ServiceRequest,
  requester: User,
  admins: User[],
  ns: NotificationService
): Promise<void> {
  const variables: Record<string, string> = {
    '{{requester_name}}': `${requester.firstName} ${requester.lastName}`,
    '{{request_title}}': request.title,
    '{{request_description}}': request.description,
    '{{urgency}}': request.urgency,
  };

  const fallbackSubject = `New Service Request: ${request.title}`;
  const fallbackBody = `A new service request has been submitted.\n\nSubmitted by: ${requester.firstName} ${requester.lastName}\nTitle: ${request.title}\nDescription: ${request.description}\nUrgency: ${request.urgency}\n\nPlease review and take action on this request in the maintenance portal.`;

  for (const admin of admins) {
    if (admin.email) {
      await sendTrackedEmail(
        ns, "new_service_request", admin.email,
        `${admin.firstName} ${admin.lastName}`,
        fallbackSubject, fallbackBody, variables
      );
    }
  }
}

export async function notifyNewVehicleReservation(
  reservation: VehicleReservation,
  requester: User,
  admins: User[],
  vehicleName: string,
  ns: NotificationService
): Promise<void> {
  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const variables: Record<string, string> = {
    '{{requester_name}}': `${requester.firstName} ${requester.lastName}`,
    '{{vehicle_name}}': vehicleName,
    '{{purpose}}': reservation.purpose,
    '{{start_date}}': startDate,
    '{{end_date}}': endDate,
  };

  const fallbackSubject = `New Vehicle Reservation Request`;
  const fallbackBody = `A new vehicle reservation has been submitted.\n\nRequested by: ${requester.firstName} ${requester.lastName}\nVehicle: ${vehicleName}\nPurpose: ${reservation.purpose}\nStart: ${startDate}\nEnd: ${endDate}\n\nPlease review and approve or deny this reservation in the maintenance portal.`;

  for (const admin of admins) {
    if (admin.email) {
      await sendTrackedEmail(
        ns, "new_vehicle_reservation", admin.email,
        `${admin.firstName} ${admin.lastName}`,
        fallbackSubject, fallbackBody, variables
      );
    }
  }
}

export async function notifyVehicleReservationApproved(
  reservation: VehicleReservation,
  requester: User,
  vehicleName: string,
  ns: NotificationService
): Promise<void> {
  if (!requester.email) return;

  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const variables: Record<string, string> = {
    '{{vehicle_name}}': vehicleName,
    '{{start_date}}': startDate,
    '{{end_date}}': endDate,
    '{{purpose}}': reservation.purpose,
  };

  const fallbackSubject = `Vehicle Reservation Approved - ${vehicleName}`;
  const fallbackBody = `Your vehicle reservation has been approved!\n\nVehicle: ${vehicleName}\nStart: ${startDate}\nEnd: ${endDate}\nPurpose: ${reservation.purpose}\n\nNext Steps:\nPlease complete the pickup process online through the maintenance portal before your reservation start time.\n1. Log in to the maintenance portal\n2. Go to your Vehicle Reservations\n3. Review the reservation details and complete any required forms\n4. Confirm your pickup time\n\nIf you have any questions, please contact the administration office.`;

  await sendTrackedEmail(
    ns, "vehicle_reservation_approved", requester.email,
    `${requester.firstName} ${requester.lastName}`,
    fallbackSubject, fallbackBody, variables
  );
}

export async function notifyVehicleReservationDenied(
  reservation: VehicleReservation,
  requester: User,
  vehicleName: string,
  ns: NotificationService
): Promise<void> {
  if (!requester.email) return;

  const startDate = formatDate(reservation.startDate);
  const endDate = formatDate(reservation.endDate);

  const variables: Record<string, string> = {
    '{{vehicle_name}}': vehicleName,
    '{{start_date}}': startDate,
    '{{end_date}}': endDate,
    '{{requester_name}}': `${requester.firstName} ${requester.lastName}`,
    '{{purpose}}': reservation.purpose,
  };

  const fallbackSubject = `Vehicle Reservation Cancelled`;
  const fallbackBody = `Your vehicle reservation has been cancelled.\n\nVehicle: ${vehicleName}\nStart: ${startDate}\nEnd: ${endDate}\nPurpose: ${reservation.purpose}\n\nIf you believe this was a mistake or need to make a new reservation, please log in to the maintenance portal and submit a new request.`;

  await sendTrackedEmail(
    ns, "vehicle_reservation_denied", requester.email,
    `${requester.firstName} ${requester.lastName}`,
    fallbackSubject, fallbackBody, variables
  );
}

export async function notifySignupPending(pendingUser: { firstName: string; lastName: string; email: string; username: string; requestedRole: string }): Promise<void> {
  const ns = new ProductionNotificationService();
  const variables: Record<string, string> = {
    '{{first_name}}': pendingUser.firstName,
    '{{last_name}}': pendingUser.lastName,
    '{{user_name}}': `${pendingUser.firstName} ${pendingUser.lastName}`,
    '{{username}}': pendingUser.username,
    '{{user_email}}': pendingUser.email,
    '{{requested_role}}': pendingUser.requestedRole,
  };

  const fallbackSubject = `Access Request Received – Hartland Maintenance`;
  const fallbackBody = `Hello ${pendingUser.firstName},\n\nYour request to access the Hartland Maintenance system has been received and is pending review by an administrator.\n\nUsername: ${pendingUser.username}\nRequested Role: ${pendingUser.requestedRole}\n\nYou will receive an email once your request has been reviewed. This typically takes 1-2 business days.\n\n— Hartland Maintenance System`;

  await sendTrackedEmail(
    ns, "signup_pending", pendingUser.email,
    `${pendingUser.firstName} ${pendingUser.lastName}`,
    fallbackSubject, fallbackBody, variables
  );

  try {
    const admins = (await storage.getAllUsers()).filter(u => u.role === "admin" && u.email);
    for (const admin of admins) {
      const adminFallbackSubject = `New Access Request: ${pendingUser.firstName} ${pendingUser.lastName}`;
      const adminFallbackBody = `A new access request has been submitted.\n\nName: ${pendingUser.firstName} ${pendingUser.lastName}\nUsername: ${pendingUser.username}\nEmail: ${pendingUser.email}\nRequested Role: ${pendingUser.requestedRole}\n\nPlease log in to review and approve or deny this request.`;

      await sendTrackedEmail(
        ns, "signup_pending", admin.email,
        `${admin.firstName} ${admin.lastName}`,
        adminFallbackSubject, adminFallbackBody, variables
      );
    }
  } catch (err) {
    console.error("[SIGNUP] Failed to notify admins:", err);
  }
}

export async function notifySignupDecision(
  pendingUser: { firstName: string; lastName: string; email: string; username: string },
  decision: "approved" | "denied",
  reason?: string,
  loginUrl?: string
): Promise<void> {
  const ns = new ProductionNotificationService();
  const variables: Record<string, string> = {
    '{{first_name}}': pendingUser.firstName,
    '{{last_name}}': pendingUser.lastName,
    '{{user_name}}': `${pendingUser.firstName} ${pendingUser.lastName}`,
    '{{username}}': pendingUser.username,
    '{{user_email}}': pendingUser.email,
    '{{decision}}': decision,
    '{{denial_reason}}': reason || '',
    '{{login_url}}': loginUrl || '/login',
  };

  if (decision === "approved") {
    const fallbackSubject = `Access Approved – Hartland Maintenance`;
    const fallbackBody = `Hello ${pendingUser.firstName},\n\nYour request to access the Hartland Maintenance system has been approved!\n\nYou can now log in with your username: ${pendingUser.username}\nLogin here: ${loginUrl || '/login'}\n\nIf you have any questions, please contact your administrator.\n\n— Hartland Maintenance System`;

    await sendTrackedEmail(
      ns, "signup_decision", pendingUser.email,
      `${pendingUser.firstName} ${pendingUser.lastName}`,
      fallbackSubject, fallbackBody, variables
    );
  } else {
    const reasonText = reason ? `\n\nReason: ${reason}` : '';
    const fallbackSubject = `Access Request Update – Hartland Maintenance`;
    const fallbackBody = `Hello ${pendingUser.firstName},\n\nYour request to access the Hartland Maintenance system was not approved at this time.${reasonText}\n\nIf you have questions, please contact your administrator.\n\n— Hartland Maintenance System`;

    await sendTrackedEmail(
      ns, "signup_decision", pendingUser.email,
      `${pendingUser.firstName} ${pendingUser.lastName}`,
      fallbackSubject, fallbackBody, variables
    );
  }
}

export const notificationService = new ProductionNotificationService();
