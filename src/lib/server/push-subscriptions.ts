/**
 * Push Subscription Server Functions
 *
 * Server-side functions for managing push subscriptions and delivery logging.
 * Handles CRUD operations for push subscriptions and records delivery confirmations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushSubscription, NotificationType } from '$lib/schemas/notifications';

/**
 * Save a push subscription for the authenticated user.
 * Uses upsert to handle duplicate endpoints gracefully.
 * @param supabase - Authenticated Supabase client
 * @param subscription - Push subscription with endpoint and keys
 */
export async function savePushSubscription(
	supabase: SupabaseClient,
	subscription: PushSubscription
): Promise<void> {
	const { error } = await supabase.from('push_subscriptions').upsert(
		{
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			updated_at: new Date().toISOString()
		},
		{
			onConflict: 'endpoint',
			ignoreDuplicates: false
		}
	);

	if (error) {
		throw new Error('Failed to save push subscription');
	}
}

/**
 * Remove a push subscription by endpoint.
 * @param supabase - Authenticated Supabase client
 * @param endpoint - The subscription endpoint URL to remove
 */
export async function removePushSubscription(
	supabase: SupabaseClient,
	endpoint: string
): Promise<void> {
	const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

	if (error) {
		throw new Error('Failed to remove push subscription');
	}
}

/**
 * Check if a user has active push subscriptions.
 * @param supabase - Authenticated Supabase client
 * @returns true if the user has at least one push subscription
 */
export async function hasActivePushSubscription(supabase: SupabaseClient): Promise<boolean> {
	const { data, error } = await supabase.from('push_subscriptions').select('endpoint').limit(1);

	if (error) {
		throw new Error('Failed to check push subscriptions');
	}

	return (data?.length ?? 0) > 0;
}

/**
 * Log a push notification delivery attempt.
 * Records the delivery status for tracking and confirmation.
 * @param supabase - Supabase client (service role for delivery logging)
 * @param userId - The user who received the notification
 * @param notificationType - Type of notification sent
 * @param endpoint - The subscription endpoint targeted
 * @param status - Delivery status
 * @param errorMessage - Optional error message if delivery failed
 */
export async function logPushDelivery(
	supabase: SupabaseClient,
	userId: string,
	notificationType: NotificationType,
	endpoint: string,
	status: 'pending' | 'delivered' | 'failed',
	errorMessage?: string
): Promise<void> {
	const { error } = await supabase.from('push_delivery_log').insert({
		user_id: userId,
		notification_type: notificationType,
		subscription_endpoint: endpoint,
		status,
		error_message: errorMessage ?? null,
		attempted_at: new Date().toISOString(),
		delivered_at: status === 'delivered' ? new Date().toISOString() : null
	});

	if (error) {
		throw new Error('Failed to log push delivery');
	}
}

/**
 * Update a delivery log entry's status.
 * Used to update from 'pending' to 'delivered' or 'failed' after the push is sent.
 * @param supabase - Supabase client
 * @param endpoint - The subscription endpoint to match
 * @param notificationType - The notification type to match
 * @param status - New delivery status
 * @param errorMessage - Optional error message for failed deliveries
 */
export async function updateDeliveryStatus(
	supabase: SupabaseClient,
	endpoint: string,
	notificationType: NotificationType,
	status: 'delivered' | 'failed',
	errorMessage?: string
): Promise<void> {
	const updateData: Record<string, unknown> = {
		status,
		error_message: errorMessage ?? null
	};

	if (status === 'delivered') {
		updateData.delivered_at = new Date().toISOString();
	}

	const { error } = await supabase
		.from('push_delivery_log')
		.update(updateData)
		.eq('subscription_endpoint', endpoint)
		.eq('notification_type', notificationType)
		.eq('status', 'pending');

	if (error) {
		throw new Error('Failed to update delivery status');
	}
}

/**
 * Fetch recent push delivery logs for a user.
 * Used to show delivery confirmation status in settings.
 * @param supabase - Authenticated Supabase client
 * @param limit - Maximum number of logs to return
 * @returns Array of delivery log entries
 */
export async function fetchPushDeliveryLogs(
	supabase: SupabaseClient,
	limit = 20
): Promise<
	Array<{
		notificationType: string;
		status: string;
		attemptedAt: string;
		errorMessage: string | null;
	}>
> {
	const { data, error } = await supabase
		.from('push_delivery_log')
		.select('notification_type, status, attempted_at, error_message')
		.order('attempted_at', { ascending: false })
		.limit(limit);

	if (error) {
		throw new Error('Failed to fetch push delivery logs');
	}

	return (
		data?.map((row) => ({
			notificationType: row.notification_type,
			status: row.status,
			attemptedAt: row.attempted_at,
			errorMessage: row.error_message
		})) ?? []
	);
}
