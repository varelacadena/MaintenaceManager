import type { User, ServiceRequest } from "@shared/schema";

export interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
}

class ProductionNotificationService implements NotificationService {
  private emailProvider: string;
  private smsEnabled: boolean;
  
  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || 'console';
    this.smsEnabled = !!process.env.TWILIO_ACCOUNT_SID;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      // Resend integration (when RESEND_API_KEY is set)
      if (this.emailProvider === 'resend' && process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'noreply@maintenance.edu',
            to,
            subject,
            text: body
          })
        });
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.statusText}`);
        }
        console.log(`[EMAIL] Sent via Resend to ${to}: ${subject}`);
        return;
      }
      
      // SendGrid integration (when SENDGRID_API_KEY is set)
      if (this.emailProvider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.EMAIL_FROM || 'noreply@maintenance.edu' },
            subject,
            content: [{ type: 'text/plain', value: body }]
          })
        });
        
        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.statusText}`);
        }
        console.log(`[EMAIL] Sent via SendGrid to ${to}: ${subject}`);
        return;
      }
      
      // Fallback to console logging if no provider configured
      console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
      console.log(`Body: ${body}`);
      console.log('NOTE: Configure EMAIL_PROVIDER and API keys for production email delivery');
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw - notification failure shouldn't break the main workflow
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      // Twilio integration (when credentials are set)
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
      
      // Fallback to console logging
      console.log(`[SMS] To: ${to}, Message: ${message}`);
      console.log('NOTE: Configure Twilio credentials for production SMS delivery');
    } catch (error) {
      console.error('Failed to send SMS:', error);
      // Don't throw - notification failure shouldn't break the main workflow
    }
  }
}

// Notification helper functions
export async function notifyTaskCreated(
  request: ServiceRequest,
  requester: User,
  assignees: User[],
  notificationService: NotificationService
): Promise<void> {
  // Notify all admin and maintenance users about new task
  for (const assignee of assignees) {
    if (assignee.email) {
      await notificationService.sendEmail(
        assignee.email,
        `New Maintenance Request: ${request.title}`,
        `A new maintenance request has been submitted by ${requester.firstName} ${requester.lastName}.\n\n` +
        `Title: ${request.title}\n` +
        `Description: ${request.description}\n` +
        `Urgency: ${request.urgency}\n` +
        `Category: ${request.category}\n\n` +
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
      `Urgency: ${request.urgency}\n` +
      `Category: ${request.category}\n\n` +
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

// Export singleton instance
export const notificationService = new ProductionNotificationService();
