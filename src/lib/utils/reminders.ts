/**
 * Event Reminder Utilities
 *
 * Utilities for formatting and managing event reminders.
 * Reminder scheduling and delivery is handled by database triggers and cron jobs.
 */

import type { Tables } from '$lib/types/database';

export type ReminderType = 'seven_days' | 'two_days' | 'day_of';
export type DeliveryStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

/**
 * Get human-readable label for reminder type
 */
export function getReminderTypeLabel(type: ReminderType): string {
	const labels: Record<ReminderType, string> = {
		seven_days: '7 days before',
		two_days: '2 days before',
		day_of: 'Day of event'
	};
	return labels[type];
}

/**
 * Get human-readable label for delivery status
 */
export function getDeliveryStatusLabel(status: DeliveryStatus): string {
	const labels: Record<DeliveryStatus, string> = {
		scheduled: 'Scheduled',
		sent: 'Sent',
		failed: 'Failed',
		cancelled: 'Cancelled'
	};
	return labels[status];
}

/**
 * Calculate when a reminder should be sent
 * Returns ISO 8601 timestamp
 *
 * @param eventStartTime - Event start time (ISO 8601 string or Date)
 * @param reminderType - Type of reminder (seven_days, two_days, day_of)
 * @returns ISO timestamp for when reminder should be sent, or null if reminder shouldn't be scheduled
 */
export function calculateReminderTime(
	eventStartTime: string | Date,
	reminderType: ReminderType
): string | null {
	const startTime = typeof eventStartTime === 'string' ? new Date(eventStartTime) : eventStartTime;
	const now = new Date();

	// Calculate base reminder time
	let reminderTime: Date;

	switch (reminderType) {
		case 'seven_days':
			reminderTime = new Date(startTime);
			reminderTime.setDate(reminderTime.getDate() - 7);
			reminderTime.setHours(9, 0, 0, 0); // 9 AM local time

			// Don't schedule if reminder would be in the past
			if (reminderTime <= now) {
				return null;
			}
			break;

		case 'two_days':
			reminderTime = new Date(startTime);
			reminderTime.setDate(reminderTime.getDate() - 2);
			reminderTime.setHours(9, 0, 0, 0); // 9 AM local time

			// Don't schedule if reminder would be in the past
			if (reminderTime <= now) {
				return null;
			}
			break;

		case 'day_of':
			reminderTime = new Date(startTime);

			// If event is after 10 AM, send reminder at 9 AM
			if (startTime.getHours() >= 10) {
				reminderTime.setHours(9, 0, 0, 0);
			} else {
				// If event is earlier, send 1 hour before
				reminderTime.setHours(reminderTime.getHours() - 1, 0, 0, 0);
			}

			// Don't schedule if reminder would be in the past
			if (reminderTime <= now) {
				return null;
			}
			break;
	}

	return reminderTime.toISOString();
}

/**
 * Get all reminder types that should be scheduled for an event
 *
 * @param eventStartTime - Event start time
 * @returns Array of reminder types with their scheduled times
 */
export function getSchedulableReminders(
	eventStartTime: string | Date
): Array<{ type: ReminderType; scheduledFor: string }> {
	const reminders: Array<{ type: ReminderType; scheduledFor: string }> = [];
	const types: ReminderType[] = ['seven_days', 'two_days', 'day_of'];

	for (const type of types) {
		const scheduledFor = calculateReminderTime(eventStartTime, type);
		if (scheduledFor) {
			reminders.push({ type, scheduledFor });
		}
	}

	return reminders;
}

/**
 * Format reminder information for display
 *
 * @param reminder - Reminder record from database
 * @returns Formatted reminder information
 */
export function formatReminderInfo(reminder: Tables<'event_reminders'>): {
	typeLabel: string;
	statusLabel: string;
	scheduledForDisplay: string;
	isFailed: boolean;
	isCancelled: boolean;
	isSent: boolean;
} {
	const scheduledFor = new Date(reminder.scheduled_for);

	return {
		typeLabel: getReminderTypeLabel(reminder.reminder_type),
		statusLabel: getDeliveryStatusLabel(reminder.status),
		scheduledForDisplay: scheduledFor.toLocaleString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}),
		isFailed: reminder.status === 'failed',
		isCancelled: reminder.status === 'cancelled',
		isSent: reminder.status === 'sent'
	};
}

/**
 * Build reminder email content structure
 * This prepares the data needed for the email template
 *
 * @param event - Event information
 * @param user - User information
 * @param reminderType - Type of reminder being sent
 * @returns Email content data
 */
export function buildReminderEmailData(
	event: {
		title: string;
		description: string | null;
		start_time: string;
		end_time: string | null;
		event_type: 'in_person' | 'online' | 'hybrid';
		venue_name: string | null;
		venue_address: string | null;
		video_link: string | null;
	},
	user: {
		display_name: string | null;
		id: string;
	},
	reminderType: ReminderType
): {
	recipientName: string;
	eventTitle: string;
	eventDescription: string;
	eventStartTime: string;
	eventEndTime: string | null;
	reminderTypeLabel: string;
	eventType: string;
	venueName: string | null;
	venueAddress: string | null;
	videoLink: string | null;
	eventUrl: string;
	mapUrl: string | null;
} {
	const startTime = new Date(event.start_time);

	// Build Google Maps directions URL if venue address exists
	let mapUrl: string | null = null;
	if (event.venue_address && (event.event_type === 'in_person' || event.event_type === 'hybrid')) {
		mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue_address)}`;
	}

	return {
		recipientName: user.display_name || 'there',
		eventTitle: event.title,
		eventDescription: event.description || '',
		eventStartTime: startTime.toLocaleString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		}),
		eventEndTime: event.end_time
			? new Date(event.end_time).toLocaleString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					timeZoneName: 'short'
				})
			: null,
		reminderTypeLabel: getReminderTypeLabel(reminderType),
		eventType: event.event_type,
		venueName: event.venue_name,
		venueAddress: event.venue_address,
		videoLink: event.video_link,
		// TODO: Replace with actual event URL when event detail page route is finalized
		eventUrl: `/events/${user.id}`, // Placeholder - will be event.id
		mapUrl
	};
}
