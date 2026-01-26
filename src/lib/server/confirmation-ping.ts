/**
 * Server-Side Confirmation Ping Processing
 *
 * Functions for processing day-of confirmation pings.
 * This module uses the service role client to bypass RLS for confirmation operations.
 *
 * Confirmation pings are sent on the day of the event to users with "going" RSVPs
 * to confirm they are still coming or allow them to bail out gracefully.
 */

import { supabaseAdmin } from './supabase';
import type { Tables } from '$lib/types/database';

/**
 * Fetch RSVPs that need confirmation pings sent today
 *
 * @param eventId - Optional event ID to filter by specific event
 * @returns Array of RSVPs with event and user data
 */
export async function fetchRsvpsNeedingConfirmation(eventId?: string): Promise<
	Array<{
		rsvpId: string;
		userId: string;
		eventId: string;
		eventStart: string;
		event: Tables<'events'>;
		user: Tables<'users'>;
	}>
> {
	let query = supabaseAdmin
		.from('event_rsvps')
		.select(
			`
			id,
			user_id,
			event_id,
			events!inner (
				*
			),
			users!inner (
				*
			)
		`
		)
		.eq('status', 'going')
		.is('confirmation_sent_at', null);

	// Filter by today's events
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	query = query
		.gte('events.start_time', today.toISOString())
		.lt('events.start_time', tomorrow.toISOString())
		.gt('events.start_time', new Date().toISOString()); // Only events that haven't started

	if (eventId) {
		query = query.eq('event_id', eventId);
	}

	const { data, error } = await query.limit(100); // Process in batches of 100

	if (error) {
		throw new Error(`Failed to fetch RSVPs needing confirmation: ${error.message}`);
	}

	if (!data || data.length === 0) {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return data.map((item: any) => ({
		rsvpId: item.id,
		userId: item.user_id,
		eventId: item.event_id,
		eventStart: item.events.start_time,
		event: item.events,
		user: item.users
	}));
}

/**
 * Send a confirmation ping notification
 *
 * @param rsvpId - RSVP ID
 * @param event - Event data
 * @param user - User data
 * @returns Success status
 */
export async function sendConfirmationPing(
	rsvpId: string,
	event: Tables<'events'>,
	user: Tables<'users'>
): Promise<{ success: boolean; error?: string }> {
	try {
		// TODO: P1 - Integrate with actual notification service
		// Options:
		// 1. Push notification via Web Push API
		// 2. Email via SendGrid/Mailgun/Resend
		// 3. In-app notification
		//
		// For now, log the notification that would be sent
		// eslint-disable-next-line no-console
		console.log('Would send confirmation ping:', {
			to: user.id,
			subject: `Still coming to ${event.title}?`,
			eventTitle: event.title,
			eventStart: event.start_time,
			confirmUrl: `/events/${event.id}/confirm?rsvp=${rsvpId}`,
			bailOutUrl: `/events/${event.id}/bail-out?rsvp=${rsvpId}`
		});

		// Mark as sent in database
		await markConfirmationSent(rsvpId);

		return { success: true };
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error sending confirmation ping:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Mark a confirmation ping as sent
 *
 * @param rsvpId - RSVP ID
 */
export async function markConfirmationSent(rsvpId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('event_rsvps')
		.update({
			confirmation_sent_at: new Date().toISOString()
		})
		.eq('id', rsvpId);

	if (error) {
		throw new Error(`Failed to mark confirmation as sent: ${error.message}`);
	}
}

/**
 * Confirm attendance (user is still coming)
 *
 * @param rsvpId - RSVP ID
 * @param userId - User ID (for verification)
 */
export async function confirmAttendance(rsvpId: string, userId: string): Promise<void> {
	// Verify the RSVP belongs to the user
	const { data: rsvp, error: fetchError } = await supabaseAdmin
		.from('event_rsvps')
		.select('user_id, status')
		.eq('id', rsvpId)
		.single();

	if (fetchError || !rsvp) {
		throw new Error('RSVP not found');
	}

	if (rsvp.user_id !== userId) {
		throw new Error('Not authorized to confirm this RSVP');
	}

	if (rsvp.status !== 'going') {
		throw new Error('Can only confirm "going" RSVPs');
	}

	// Update confirmation status
	const { error } = await supabaseAdmin
		.from('event_rsvps')
		.update({
			confirmation_status: 'confirmed',
			confirmation_response_at: new Date().toISOString()
		})
		.eq('id', rsvpId);

	if (error) {
		throw new Error(`Failed to confirm attendance: ${error.message}`);
	}
}

/**
 * Bail out of attendance (user can't make it)
 * This also promotes from waitlist if applicable
 *
 * @param rsvpId - RSVP ID
 * @param userId - User ID (for verification)
 * @param reason - Optional reason for bailing out
 */
export async function bailOutAttendance(
	rsvpId: string,
	userId: string,
	reason?: string
): Promise<void> {
	// Verify the RSVP belongs to the user
	const { data: rsvp, error: fetchError } = await supabaseAdmin
		.from('event_rsvps')
		.select('user_id, status, event_id')
		.eq('id', rsvpId)
		.single();

	if (fetchError || !rsvp) {
		throw new Error('RSVP not found');
	}

	if (rsvp.user_id !== userId) {
		throw new Error('Not authorized to bail out this RSVP');
	}

	if (rsvp.status !== 'going') {
		throw new Error('Can only bail out "going" RSVPs');
	}

	// Use the database function to handle bail-out with waitlist promotion
	const { error: rpcError } = await supabaseAdmin.rpc('bail_out_attendance', {
		p_rsvp_id: rsvpId,
		p_reason: reason || null
	});

	if (rpcError) {
		throw new Error(`Failed to bail out: ${rpcError.message}`);
	}
}

/**
 * Process all confirmation pings that need to be sent
 * This function should be called by a cron job (e.g., every hour on event days)
 *
 * @returns Summary of processing results
 */
export async function processConfirmationPings(): Promise<{
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
		// Fetch RSVPs that need confirmation pings
		const rsvps = await fetchRsvpsNeedingConfirmation();
		results.processed = rsvps.length;

		if (rsvps.length === 0) {
			return results;
		}

		// eslint-disable-next-line no-console
		console.log(`Processing ${rsvps.length} confirmation pings`);

		// Process each RSVP
		for (const { rsvpId, event, user } of rsvps) {
			const result = await sendConfirmationPing(rsvpId, event, user);

			if (result.success) {
				results.sent++;
			} else {
				results.failed++;
				// eslint-disable-next-line no-console
				console.error(`Failed to send confirmation ping for RSVP ${rsvpId}:`, result.error);
			}
		}

		// eslint-disable-next-line no-console
		console.log(`Confirmation ping processing complete:`, results);
		return results;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error processing confirmation pings:', error);
		throw error;
	}
}

/**
 * Get confirmation statistics for an event
 *
 * @param eventId - Event ID
 * @returns Confirmation statistics
 */
export async function getConfirmationStats(eventId: string): Promise<{
	total: number;
	pending: number;
	confirmed: number;
	bailedOut: number;
}> {
	const { data, error } = await supabaseAdmin
		.from('event_rsvps')
		.select('confirmation_status')
		.eq('event_id', eventId)
		.eq('status', 'going');

	if (error) {
		throw new Error(`Failed to fetch confirmation stats: ${error.message}`);
	}

	const stats = {
		total: 0,
		pending: 0,
		confirmed: 0,
		bailedOut: 0
	};

	if (!data) {
		return stats;
	}

	stats.total = data.length;

	for (const rsvp of data) {
		switch (rsvp.confirmation_status) {
			case 'pending':
				stats.pending++;
				break;
			case 'confirmed':
				stats.confirmed++;
				break;
			case 'bailed_out':
				stats.bailedOut++;
				break;
		}
	}

	return stats;
}
