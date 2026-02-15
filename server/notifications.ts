import { Resend } from 'resend';
import type { User, ServiceRequest, VehicleReservation } from "@shared/schema";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Not specified";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString();
}

// Resend integration via Replit connector
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
      const senderEmail = fromEmail || 'noreply@maintenance.edu';

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

export async function notifyTaskCreated(
  request: ServiceRequest,
  requester: User,
  assignees: User[],
  notificationService: NotificationService
): Promise<void> {
  for (const assignee of assignees) {
    if (assignee.email) {
      await notificationService.sendEmail(
        assignee.email,
        `New Maintenance Request: ${request.title}`,
        `A new maintenance request has been submitted by ${requester.firstName} ${requester.lastName}.\n\n` +
        `Title: ${request.title}\n` +
        `Description: ${request.description}\n` +
        `Urgency: ${request.urgency}\n\n` +
        `Please review and assign this request.`
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

  if (requester.email) {
    await notificationService.sendEmail(
      requester.email,
      `Status Update: ${request.title}`,
      `Your maintenance request "${request.title}" ${message}.\n\n` +
      `Previous Status: ${oldStatus}\n` +
      `New Status: ${newStatus}\n\n` +
      `You can view the details and updates in the maintenance portal.`
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
  if (assignedTo.email) {
    await notificationService.sendEmail(
      assignedTo.email,
      `Task Assigned: ${request.title}`,
      `You have been assigned to work on a maintenance request.\n\n` +
      `Title: ${request.title}\n` +
      `Description: ${request.description}\n` +
      `Urgency: ${request.urgency}\n\n` +
      `Please review the task details and update the status as you progress.`
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
  for (const admin of admins) {
    if (admin.email) {
      await ns.sendEmail(
        admin.email,
        `New Service Request: ${request.title}`,
        `A new service request has been submitted.\n\n` +
        `Submitted by: ${requester.firstName} ${requester.lastName}\n` +
        `Title: ${request.title}\n` +
        `Description: ${request.description}\n` +
        `Urgency: ${request.urgency}\n\n` +
        `Please review and take action on this request in the maintenance portal.`
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

  for (const admin of admins) {
    if (admin.email) {
      await ns.sendEmail(
        admin.email,
        `New Vehicle Reservation Request`,
        `A new vehicle reservation has been submitted.\n\n` +
        `Requested by: ${requester.firstName} ${requester.lastName}\n` +
        `Vehicle: ${vehicleName}\n` +
        `Purpose: ${reservation.purpose}\n` +
        `Start: ${startDate}\n` +
        `End: ${endDate}\n\n` +
        `Please review and approve or deny this reservation in the maintenance portal.`
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

  await ns.sendEmail(
    requester.email,
    `Vehicle Reservation Approved - ${vehicleName}`,
    `Your vehicle reservation has been approved!\n\n` +
    `Vehicle: ${vehicleName}\n` +
    `Start: ${startDate}\n` +
    `End: ${endDate}\n` +
    `Purpose: ${reservation.purpose}\n\n` +
    `Next Steps:\n` +
    `Please complete the pickup process online through the maintenance portal before your reservation start time.\n` +
    `1. Log in to the maintenance portal\n` +
    `2. Go to your Vehicle Reservations\n` +
    `3. Review the reservation details and complete any required forms\n` +
    `4. Confirm your pickup time\n\n` +
    `If you have any questions, please contact the administration office.`
  );
}

export const notificationService = new ProductionNotificationService();
