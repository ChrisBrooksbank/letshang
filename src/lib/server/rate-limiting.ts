/**
 * Server functions for messaging rate limiting
 * Detects mass-messaging patterns, throttles suspicious behavior, and alerts admins
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RateLimitAction, RateLimitRecord, RateLimitAlert } from '$lib/schemas/rate-limiting';

/**
 * Check the current rate limit status for a user.
 * Returns the action status without recording a new message.
 * @param supabase - Supabase client (authenticated)
 * @param userId - UUID of the user to check
 * @returns The current rate limit action for the user
 */
export async function checkRateLimit(
	supabase: SupabaseClient,
	userId: string
): Promise<RateLimitAction> {
	const { data, error } = await supabase.rpc('check_rate_limit', {
		p_user_id: userId
	});

	if (error) {
		throw new Error(`Failed to check rate limit: ${error.message}`);
	}

	return data as RateLimitAction;
}

/**
 * Record a message send event and evaluate rate limits.
 * Implements sliding window detection: 10 messages per 1-hour window.
 * Returns the rate limit action (allowed/warned/throttled/suspended).
 * @param supabase - Supabase client (authenticated)
 * @param userId - UUID of the user sending the message
 * @returns The rate limit action result
 */
export async function recordMessageSend(
	supabase: SupabaseClient,
	userId: string
): Promise<RateLimitAction> {
	const { data, error } = await supabase.rpc('record_message_send', {
		p_user_id: userId
	});

	if (error) {
		throw new Error(`Failed to record message send: ${error.message}`);
	}

	return data as RateLimitAction;
}

/**
 * Fetch the rate limit history for the current user.
 * Returns recent rate limit records showing message activity.
 * @param supabase - Supabase client (authenticated)
 * @returns Array of rate limit records ordered by most recent first
 */
export async function getRateLimitHistory(supabase: SupabaseClient): Promise<RateLimitRecord[]> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		throw new Error('User must be authenticated');
	}

	const { data, error } = await supabase
		.from('message_rate_limits')
		.select(
			`
			id,
			user_id,
			message_count,
			window_start,
			window_end,
			action_taken,
			created_at
		`
		)
		.eq('user_id', userId)
		.order('window_start', { ascending: false })
		.limit(50);

	if (error) {
		throw new Error(`Failed to fetch rate limit history: ${error.message}`);
	}

	return data.map((row) => ({
		id: row.id,
		userId: row.user_id,
		messageCount: row.message_count,
		windowStart: row.window_start,
		windowEnd: row.window_end,
		actionTaken: row.action_taken as RateLimitAction,
		createdAt: row.created_at
	}));
}

/**
 * Fetch pending rate limit alerts for admin review.
 * Only accessible via service_role (admin operations).
 * @param supabase - Supabase client (service_role)
 * @returns Array of unreviewed rate limit alerts
 */
export async function getPendingRateLimitAlerts(
	supabase: SupabaseClient
): Promise<RateLimitAlert[]> {
	const { data, error } = await supabase
		.from('rate_limit_alerts')
		.select(
			`
			id,
			user_id,
			alert_type,
			details,
			messages_in_window,
			window_start,
			window_end,
			reviewed,
			created_at
		`
		)
		.eq('reviewed', false)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch rate limit alerts: ${error.message}`);
	}

	return data.map((row) => ({
		id: row.id,
		userId: row.user_id,
		alertType: row.alert_type as RateLimitAlert['alertType'],
		details: row.details,
		messagesInWindow: row.messages_in_window,
		windowStart: row.window_start,
		windowEnd: row.window_end,
		reviewed: row.reviewed,
		createdAt: row.created_at
	}));
}

/**
 * Mark a rate limit alert as reviewed by an admin.
 * @param supabase - Supabase client (service_role)
 * @param alertId - UUID of the alert to mark as reviewed
 */
export async function markAlertReviewed(supabase: SupabaseClient, alertId: string): Promise<void> {
	const { error } = await supabase
		.from('rate_limit_alerts')
		.update({ reviewed: true })
		.eq('id', alertId);

	if (error) {
		throw new Error(`Failed to mark alert as reviewed: ${error.message}`);
	}
}
