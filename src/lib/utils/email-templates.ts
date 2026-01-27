/**
 * Email Template Utilities
 *
 * HTML email templates for all notification types.
 * Templates are mobile-friendly and branded with LetsHang design.
 */

import type { NotificationType } from '$lib/schemas/notifications';

/**
 * Email template data interfaces
 */

export interface BaseEmailData {
	recipientName: string;
	unsubscribeUrl: string;
}

export interface EventReminderEmailData extends BaseEmailData {
	eventTitle: string;
	eventStart: string; // ISO datetime
	eventEnd: string; // ISO datetime
	eventType: 'in_person' | 'online' | 'hybrid';
	venueName?: string | null;
	venueAddress?: string | null;
	videoLink?: string | null;
	eventUrl: string;
	reminderType: '7_days' | '2_days' | 'day_of';
}

export interface RsvpConfirmationEmailData extends BaseEmailData {
	eventTitle: string;
	eventStart: string;
	eventType: 'in_person' | 'online' | 'hybrid';
	venueName?: string | null;
	videoLink?: string | null;
	eventUrl: string;
	rsvpStatus: 'going' | 'interested';
}

export interface WaitlistPromotionEmailData extends BaseEmailData {
	eventTitle: string;
	eventStart: string;
	eventUrl: string;
}

export interface NewEventInGroupEmailData extends BaseEmailData {
	groupName: string;
	eventTitle: string;
	eventStart: string;
	eventUrl: string;
	groupUrl: string;
}

export interface GroupAnnouncementEmailData extends BaseEmailData {
	groupName: string;
	announcementTitle: string;
	announcementBody: string;
	groupUrl: string;
}

export interface EventUpdateEmailData extends BaseEmailData {
	eventTitle: string;
	updateType: 'update' | 'cancellation';
	updateMessage: string;
	eventUrl: string;
}

export interface NewMessageEmailData extends BaseEmailData {
	senderName: string;
	messagePreview: string;
	messageUrl: string;
}

/**
 * Base HTML email template with LetsHang branding
 */
function getEmailBaseTemplate(content: string, preheader: string, unsubscribeUrl: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>LetsHang</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background-color: #2563eb;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 32px 24px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 16px 0;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .preheader {
            display: none;
            max-width: 0;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 24px 16px;
            }
            .header {
                padding: 16px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="preheader">${escapeHtml(preheader)}</div>
    <div class="email-container">
        <div class="header">
            <h1>LetsHang</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>You're receiving this email because you signed up for LetsHang.</p>
            <p><a href="${escapeHtml(unsubscribeUrl)}">Manage your notification preferences</a></p>
            <p style="margin-top: 16px;">&copy; 2026 LetsHang. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

/**
 * Format ISO datetime to readable format
 */
function formatDateTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	});
}

/**
 * Get reminder type label
 */
function getReminderTypeLabel(reminderType: string): string {
	switch (reminderType) {
		case '7_days':
			return 'Coming up in 7 days';
		case '2_days':
			return 'Coming up in 2 days';
		case 'day_of':
			return 'Happening today';
		default:
			return 'Event reminder';
	}
}

/**
 * Event Reminder Email
 */
export function generateEventReminderEmail(data: EventReminderEmailData): {
	html: string;
	subject: string;
} {
	const reminderLabel = getReminderTypeLabel(data.reminderType);

	let locationInfo = '';
	if (data.eventType === 'in_person' && data.venueName) {
		locationInfo = `
            <p style="margin: 16px 0; font-size: 16px;">
                <strong>Location:</strong><br>
                ${escapeHtml(data.venueName)}<br>
                ${data.venueAddress ? escapeHtml(data.venueAddress) : ''}
            </p>`;
	} else if (data.eventType === 'online' && data.videoLink) {
		locationInfo = `
            <p style="margin: 16px 0; font-size: 16px;">
                <strong>Online Event</strong><br>
                Join via video link (available after RSVP)
            </p>`;
	} else if (data.eventType === 'hybrid') {
		locationInfo = `
            <p style="margin: 16px 0; font-size: 16px;">
                <strong>Hybrid Event</strong><br>
                Join in person or online
            </p>`;
	}

	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">${reminderLabel}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">
            Just a friendly reminder about your upcoming event:
        </p>
        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 20px;">${escapeHtml(data.eventTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
                <strong>When:</strong> ${formatDateTime(data.eventStart)}
            </p>
            ${locationInfo}
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.eventUrl)}" class="button">View Event Details</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            See you there!
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`${reminderLabel}: ${data.eventTitle}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `${reminderLabel}: ${data.eventTitle}`
	};
}

/**
 * RSVP Confirmation Email
 */
export function generateRsvpConfirmationEmail(data: RsvpConfirmationEmailData): {
	html: string;
	subject: string;
} {
	const statusLabel = data.rsvpStatus === 'going' ? "You're going!" : "You're interested!";
	const statusMessage =
		data.rsvpStatus === 'going'
			? "We've confirmed your attendance."
			: "We've marked you as interested. You'll get updates about this event.";

	let locationInfo = '';
	if (data.eventType === 'in_person' && data.venueName) {
		locationInfo = `
            <p style="margin: 16px 0; font-size: 16px;">
                <strong>Location:</strong><br>
                ${escapeHtml(data.venueName)}
            </p>`;
	} else if (data.eventType === 'online') {
		locationInfo = `
            <p style="margin: 16px 0; font-size: 16px;">
                <strong>Online Event</strong><br>
                Video link will be available closer to the event
            </p>`;
	}

	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">${statusLabel}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">${statusMessage}</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #15803d; font-size: 20px;">${escapeHtml(data.eventTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
                <strong>When:</strong> ${formatDateTime(data.eventStart)}
            </p>
            ${locationInfo}
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.eventUrl)}" class="button">View Event Details</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            Can't make it? You can update your RSVP anytime on the event page.
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`RSVP confirmed for ${data.eventTitle}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `RSVP Confirmed: ${data.eventTitle}`
	};
}

/**
 * Waitlist Promotion Email
 */
export function generateWaitlistPromotionEmail(data: WaitlistPromotionEmailData): {
	html: string;
	subject: string;
} {
	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">Great news - You're in!</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">
            A spot just opened up for an event you were waitlisted for:
        </p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #92400e; font-size: 20px;">${escapeHtml(data.eventTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
                <strong>When:</strong> ${formatDateTime(data.eventStart)}
            </p>
        </div>
        <p style="font-size: 16px; color: #4b5563;">
            Your status has been automatically upgraded to "Going". You're all set!
        </p>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.eventUrl)}" class="button">View Event Details</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            Changed your mind? You can update your RSVP on the event page.
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`You're off the waitlist for ${data.eventTitle}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `You're in! ${data.eventTitle}`
	};
}

/**
 * New Event in Group Email
 */
export function generateNewEventInGroupEmail(data: NewEventInGroupEmailData): {
	html: string;
	subject: string;
} {
	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">New Event in ${escapeHtml(data.groupName)}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">
            A new event has been created in one of your groups:
        </p>
        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 20px;">${escapeHtml(data.eventTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
                <strong>Group:</strong> ${escapeHtml(data.groupName)}
            </p>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937;">
                <strong>When:</strong> ${formatDateTime(data.eventStart)}
            </p>
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.eventUrl)}" class="button">View Event & RSVP</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            <a href="${escapeHtml(data.groupUrl)}" style="color: #2563eb; text-decoration: none;">View ${escapeHtml(data.groupName)}</a>
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`New event in ${data.groupName}: ${data.eventTitle}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `New Event: ${data.eventTitle}`
	};
}

/**
 * Group Announcement Email
 */
export function generateGroupAnnouncementEmail(data: GroupAnnouncementEmailData): {
	html: string;
	subject: string;
} {
	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">Announcement from ${escapeHtml(data.groupName)}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #92400e; font-size: 20px;">${escapeHtml(data.announcementTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937; white-space: pre-wrap;">
                ${escapeHtml(data.announcementBody)}
            </p>
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.groupUrl)}" class="button">Visit ${escapeHtml(data.groupName)}</a>
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`${data.groupName}: ${data.announcementTitle}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `${data.groupName}: ${data.announcementTitle}`
	};
}

/**
 * Event Update/Cancellation Email
 */
export function generateEventUpdateEmail(data: EventUpdateEmailData): {
	html: string;
	subject: string;
} {
	const isCancellation = data.updateType === 'cancellation';
	const title = isCancellation ? 'Event Cancelled' : 'Event Updated';
	const borderColor = isCancellation ? '#dc2626' : '#f59e0b';
	const bgColor = isCancellation ? '#fef2f2' : '#fef3c7';
	const textColor = isCancellation ? '#991b1b' : '#92400e';

	const content = `
        <h2 style="margin-top: 0; color: ${textColor}; font-size: 24px;">${title}</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">
            ${isCancellation ? 'An event you RSVPed to has been cancelled:' : 'An event you RSVPed to has been updated:'}
        </p>
        <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: ${textColor}; font-size: 20px;">${escapeHtml(data.eventTitle)}</h3>
            <p style="margin: 8px 0; font-size: 16px; color: #1f2937; white-space: pre-wrap;">
                ${escapeHtml(data.updateMessage)}
            </p>
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.eventUrl)}" class="button">View Event Page</a>
        </p>
        ${
					isCancellation
						? '<p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Sorry for any inconvenience. Hope to see you at another event soon!</p>'
						: '<p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Your RSVP is still active unless you choose to cancel it.</p>'
				}`;

	const html = getEmailBaseTemplate(content, `${title}: ${data.eventTitle}`, data.unsubscribeUrl);

	return {
		html,
		subject: `${title}: ${data.eventTitle}`
	};
}

/**
 * New Message Email
 */
export function generateNewMessageEmail(data: NewMessageEmailData): {
	html: string;
	subject: string;
} {
	const content = `
        <h2 style="margin-top: 0; color: #1f2937; font-size: 24px;">New Message</h2>
        <p style="font-size: 16px; color: #4b5563;">Hi ${escapeHtml(data.recipientName)},</p>
        <p style="font-size: 16px; color: #4b5563;">
            ${escapeHtml(data.senderName)} sent you a message:
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 16px; color: #1f2937;">
                ${escapeHtml(data.messagePreview)}
            </p>
        </div>
        <p style="text-align: center;">
            <a href="${escapeHtml(data.messageUrl)}" class="button">Read & Reply</a>
        </p>`;

	const html = getEmailBaseTemplate(
		content,
		`New message from ${data.senderName}`,
		data.unsubscribeUrl
	);

	return {
		html,
		subject: `New message from ${data.senderName}`
	};
}

/**
 * Generate email based on notification type
 */
export function generateNotificationEmail(
	type: NotificationType,
	data: unknown
): { html: string; subject: string } | null {
	switch (type) {
		case 'event_reminder':
			return generateEventReminderEmail(data as EventReminderEmailData);
		case 'rsvp_confirmation':
			return generateRsvpConfirmationEmail(data as RsvpConfirmationEmailData);
		case 'waitlist_promotion':
			return generateWaitlistPromotionEmail(data as WaitlistPromotionEmailData);
		case 'new_event_in_group':
			return generateNewEventInGroupEmail(data as NewEventInGroupEmailData);
		case 'group_announcement':
			return generateGroupAnnouncementEmail(data as GroupAnnouncementEmailData);
		case 'event_update_cancellation':
			return generateEventUpdateEmail(data as EventUpdateEmailData);
		case 'new_message':
			return generateNewMessageEmail(data as NewMessageEmailData);
		default:
			return null;
	}
}
