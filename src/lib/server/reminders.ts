/**
 * Server-Side Reminder Processing
 *
 * Functions for processing and sending event reminders.
 * This module uses the service role client to bypass RLS for reminder operations.
 *
 * NOTE: For P1, this provides the foundation for reminder delivery.
 * Email sending will be integrated with Supabase Auth email templates or external email service.
 * A cron job (Supabase Edge Function) will call processScheduledReminders() periodically.
 */

import { supabaseAdmin } from './supabase';
import { buildReminderEmailData } from '$lib/utils/reminders';
import type { Tables } from '$lib/types/database';

/**
 * Fetch reminders that need to be sent now
 *
 * @returns Array of reminders with event and user data
 */
export async function fetchDueReminders(): Promise<
	Array<{
		reminder: Tables<'event_reminders'>;
		event: Tables<'events'>;
		user: Tables<'users'>;
	}>
> {
	const now = new Date().toISOString();

	// Query scheduled reminders that are due
	const { data: reminders, error: reminderError } = await supabaseAdmin
		.from('event_reminders')
		.select('*')
		.eq('status', 'scheduled')
		.lte('scheduled_for', now)
		.order('scheduled_for', { ascending: true })
		.limit(100); // Process in batches of 100

	if (reminderError) {
		throw new Error(`Failed to fetch due reminders: ${reminderError.message}`);
	}

	if (!reminders || reminders.length === 0) {
		return [];
	}

	// Fetch associated events and users
	const eventIds = [...new Set(reminders.map((r) => r.event_id))];
	const userIds = [...new Set(reminders.map((r) => r.user_id))];

	const [eventsResult, usersResult] = await Promise.all([
		supabaseAdmin.from('events').select('*').in('id', eventIds),
		supabaseAdmin.from('users').select('*').in('id', userIds)
	]);

	if (eventsResult.error) {
		throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
	}

	if (usersResult.error) {
		throw new Error(`Failed to fetch users: ${usersResult.error.message}`);
	}

	// Create lookup maps
	const eventsMap = new Map(eventsResult.data.map((e) => [e.id, e]));
	const usersMap = new Map(usersResult.data.map((u) => [u.id, u]));

	// Combine data
	return reminders
		.map((reminder) => {
			const event = eventsMap.get(reminder.event_id);
			const user = usersMap.get(reminder.user_id);

			if (!event || !user) {
				return null;
			}

			return { reminder, event, user };
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
}

/**
 * Send a reminder email
 *
 * @param reminder - Reminder record
 * @param event - Event data
 * @param user - User data
 * @returns Success status
 */
export async function sendReminderEmail(
	reminder: Tables<'event_reminders'>,
	event: Tables<'events'>,
	user: Tables<'users'>
): Promise<{ success: boolean; error?: string }> {
	try {
		// Build email content
		const emailData = buildReminderEmailData(
			{
				title: event.title,
				description: event.description,
				start_time: event.start_time,
				end_time: event.end_time,
				event_type: event.event_type,
				venue_name: event.venue_name,
				venue_address: event.venue_address,
				video_link: event.video_link
			},
			{
				display_name: user.display_name,
				id: user.id
			},
			reminder.reminder_type
		);

		// TODO: P1 - Integrate with actual email service
		// Options:
		// 1. Supabase Auth email templates (limited customization)
		// 2. External service like SendGrid, Mailgun, Resend
		// 3. Supabase Edge Function with Deno.sendEmail

		// For now, log the email that would be sent
		// eslint-disable-next-line no-console
		console.log('Would send reminder email:', {
			to: user.id, // In real implementation, use user email from auth.users
			subject: `Reminder: ${emailData.eventTitle} - ${emailData.reminderTypeLabel}`,
			data: emailData
		});

		// Simulate successful delivery
		return { success: true };
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error sending reminder email:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Mark a reminder as sent
 *
 * @param reminderId - Reminder ID
 */
export async function markReminderSent(reminderId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('event_reminders')
		.update({
			status: 'sent',
			sent_at: new Date().toISOString()
		})
		.eq('id', reminderId);

	if (error) {
		throw new Error(`Failed to mark reminder as sent: ${error.message}`);
	}
}

/**
 * Mark a reminder as failed
 *
 * @param reminderId - Reminder ID
 * @param errorMessage - Error message
 */
export async function markReminderFailed(reminderId: string, errorMessage: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('event_reminders')
		.update({
			status: 'failed',
			error_message: errorMessage
		})
		.eq('id', reminderId);

	if (error) {
		throw new Error(`Failed to mark reminder as failed: ${error.message}`);
	}
}

/**
 * Process all scheduled reminders that are due
 * This function should be called by a cron job (e.g., every 5 minutes)
 *
 * @returns Summary of processing results
 */
export async function processScheduledReminders(): Promise<{
	processed: number;
	sent: number;
	failed: number;
}> {
	const results = {
		processed: 0,
		sent: 0,
		failed: 0
	};

	try {
		// Fetch reminders that are due
		const dueReminders = await fetchDueReminders();
		results.processed = dueReminders.length;

		if (dueReminders.length === 0) {
			return results;
		}

		// eslint-disable-next-line no-console
		console.log(`Processing ${dueReminders.length} due reminders`);

		// Process each reminder
		for (const { reminder, event, user } of dueReminders) {
			const result = await sendReminderEmail(reminder, event, user);

			if (result.success) {
				await markReminderSent(reminder.id);
				results.sent++;
			} else {
				await markReminderFailed(reminder.id, result.error || 'Unknown error');
				results.failed++;
			}
		}

		// eslint-disable-next-line no-console
		console.log(`Reminder processing complete:`, results);
		return results;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error processing scheduled reminders:', error);
		throw error;
	}
}

/**
 * Cancel all reminders for a specific RSVP
 * Called when user changes RSVP to "not_going" or cancels
 *
 * @param eventId - Event ID
 * @param userId - User ID
 */
export async function cancelRemindersForRsvp(eventId: string, userId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('event_reminders')
		.update({
			status: 'cancelled'
		})
		.eq('event_id', eventId)
		.eq('user_id', userId)
		.eq('status', 'scheduled');

	if (error) {
		throw new Error(`Failed to cancel reminders: ${error.message}`);
	}
}
