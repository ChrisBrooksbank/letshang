import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationType, NotificationPreference } from '$lib/schemas/notifications';

/**
 * Fetch all notification preferences for the authenticated user
 * @param supabase - Authenticated Supabase client
 * @returns Array of notification preferences
 */
export async function fetchUserNotificationPreferences(
	supabase: SupabaseClient
): Promise<NotificationPreference[]> {
	const { data, error } = await supabase
		.from('notification_preferences')
		.select('notification_type, push_enabled, email_enabled, in_app_enabled')
		.order('notification_type', { ascending: true });

	if (error) {
		throw new Error('Failed to fetch notification preferences');
	}

	// Transform database rows to NotificationPreference format
	return (
		data?.map((row) => ({
			notificationType: row.notification_type,
			pushEnabled: row.push_enabled,
			emailEnabled: row.email_enabled,
			inAppEnabled: row.in_app_enabled
		})) || []
	);
}

/**
 * Update a single notification preference for the authenticated user
 * @param supabase - Authenticated Supabase client
 * @param notificationType - Type of notification to update
 * @param pushEnabled - Enable/disable push notifications
 * @param emailEnabled - Enable/disable email notifications
 * @param inAppEnabled - Enable/disable in-app notifications
 * @returns The updated notification preference
 */
export async function updateNotificationPreference(
	supabase: SupabaseClient,
	notificationType: NotificationType,
	pushEnabled: boolean,
	emailEnabled: boolean,
	inAppEnabled: boolean
): Promise<NotificationPreference> {
	const { data, error } = await supabase
		.from('notification_preferences')
		.update({
			push_enabled: pushEnabled,
			email_enabled: emailEnabled,
			in_app_enabled: inAppEnabled,
			updated_at: new Date().toISOString()
		})
		.eq('notification_type', notificationType)
		.select('notification_type, push_enabled, email_enabled, in_app_enabled')
		.single();

	if (error) {
		throw new Error('Failed to update notification preference');
	}

	if (!data) {
		throw new Error('Notification preference not found');
	}

	return {
		notificationType: data.notification_type,
		pushEnabled: data.push_enabled,
		emailEnabled: data.email_enabled,
		inAppEnabled: data.in_app_enabled
	};
}

/**
 * Update multiple notification preferences at once
 * @param supabase - Authenticated Supabase client
 * @param preferences - Array of notification preferences to update
 * @returns Array of updated notification preferences
 */
export async function updateMultipleNotificationPreferences(
	supabase: SupabaseClient,
	preferences: NotificationPreference[]
): Promise<NotificationPreference[]> {
	const updatePromises = preferences.map((pref) =>
		updateNotificationPreference(
			supabase,
			pref.notificationType,
			pref.pushEnabled,
			pref.emailEnabled,
			pref.inAppEnabled
		)
	);

	return Promise.all(updatePromises);
}

/**
 * Initialize default notification preferences for a user
 * This is called automatically by the database trigger on user creation,
 * but can be called manually if needed
 * @param supabase - Admin Supabase client
 * @param userId - User ID to initialize preferences for
 */
export async function initializeNotificationPreferences(
	supabase: SupabaseClient,
	userId: string
): Promise<void> {
	const { error } = await supabase.rpc('initialize_notification_preferences', {
		p_user_id: userId
	});

	if (error) {
		throw new Error('Failed to initialize notification preferences');
	}
}
