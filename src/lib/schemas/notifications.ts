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
 * Notification schema
 * Represents an individual notification in the notification center
 */
export const notificationSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	notificationType: notificationTypeEnum,
	title: z.string().min(1).max(100),
	message: z.string().min(1).max(500),
	link: z.string().nullable(),
	isRead: z.boolean(),
	createdAt: z.string().datetime(),
	readAt: z.string().datetime().nullable()
});

/**
 * Push subscription schema
 * Validates Web Push API subscription data
 */
export const pushSubscriptionSchema = z.object({
	endpoint: z.string().url().max(500),
	keys: z.object({
		p256dh: z.string().min(1).max(200),
		auth: z.string().min(1).max(100)
	})
});

/**
 * Push delivery status enum
 */
export const pushDeliveryStatusEnum = z.enum(['pending', 'delivered', 'failed']);

/**
 * Push delivery log schema
 * Tracks delivery confirmation for push notifications
 */
export const pushDeliveryLogSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	notificationType: notificationTypeEnum,
	subscriptionEndpoint: z.string().url().max(500),
	status: pushDeliveryStatusEnum,
	errorMessage: z.string().nullable(),
	attemptedAt: z.string().datetime(),
	deliveredAt: z.string().datetime().nullable()
});

/**
 * Type exports
 */
export type NotificationType = z.infer<typeof notificationTypeEnum>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
