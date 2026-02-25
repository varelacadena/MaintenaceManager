import { Resend } from 'resend';
import { storage } from './storage';
import type { User, ServiceRequest, VehicleReservation } from "@shared/schema";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Not specified";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString();
}

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME is not set - Resend connector unavailable');
  }

  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('Replit identity token not found - Resend connector unavailable');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
    throw new Error('Resend connector not connected or missing API key. Please set up the Resend integration.');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
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
  sendSMS(to: string, message: string): Promise<void>;
}

class ProductionNotificationService implements NotificationService {
  private smsEnabled: boolean;

  constructor() {
    this.smsEnabled = !!process.env.TWILIO_ACCOUNT_SID;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const senderEmail = 'onboarding@resend.dev';

      const { error } = await client.emails.send({
        from: senderEmail,
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

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      if (this.smsEnabled && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: to,
              From: process.env.TWILIO_PHONE_NUMBER,
              Body: message
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Twilio API error: ${response.statusText}`);
        }
        console.log(`[SMS] Sent via Twilio to ${to}`);
        return;
      }

      console.log(`[SMS] To: ${to}, Message: ${message}`);
      console.log('NOTE: Configure Twilio credentials for production SMS delivery');
    } catch (error) {
      console.error('Failed to send SMS:', error);
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

    if (assignee.phoneNumber) {
      await notificationService.sendSMS(
        assignee.phoneNumber,
        `New ${request.urgency} priority maintenance request: ${request.title}`
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

  if (requester.phoneNumber) {
    await notificationService.sendSMS(
      requester.phoneNumber,
      `Your request "${request.title}" ${message}.`
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

  if (assignedTo.phoneNumber) {
    await notificationService.sendSMS(
      assignedTo.phoneNumber,
      `New task assigned: ${request.title} (${request.urgency} priority)`
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

export const notificationService = new ProductionNotificationService();
