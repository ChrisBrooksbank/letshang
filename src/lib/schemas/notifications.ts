import { z } from 'zod';

/**
 * Notification type enum for validation
 * Must match the notification_type enum in the database
 */
export const notificationTypeEnum = z.enum([
	'new_event_in_group',
	'rsvp_confirmation',
	'event_reminder',
	'waitlist_promotion',
	'new_message',
	'group_announcement',
	'event_update_cancellation'
]);

/**
 * Notification preference schema
 * Validates notification preference settings for a single notification type
 */
export const notificationPreferenceSchema = z.object({
	notificationType: notificationTypeEnum,
	pushEnabled: z.boolean(),
	emailEnabled: z.boolean(),
	inAppEnabled: z.boolean()
});

/**
 * Type exports
 */
export type NotificationType = z.infer<typeof notificationTypeEnum>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
