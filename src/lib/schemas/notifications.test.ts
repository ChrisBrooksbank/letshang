import { describe, it, expect } from 'vitest';
import {
	notificationTypeEnum,
	notificationPreferenceSchema,
	notificationSchema
} from './notifications';

describe('notificationTypeEnum', () => {
	it('accepts valid notification types', () => {
		const validTypes = [
			'new_event_in_group',
			'rsvp_confirmation',
			'event_reminder',
			'waitlist_promotion',
			'new_message',
			'group_announcement',
			'event_update_cancellation'
		];

		validTypes.forEach((type) => {
			const result = notificationTypeEnum.safeParse(type);
			expect(result.success).toBe(true);
		});
	});

	it('rejects invalid notification types', () => {
		const result = notificationTypeEnum.safeParse('invalid_type');
		expect(result.success).toBe(false);
	});
});

describe('notificationPreferenceSchema', () => {
	it('accepts valid notification preference', () => {
		const result = notificationPreferenceSchema.safeParse({
			notificationType: 'event_reminder',
			pushEnabled: true,
			emailEnabled: true,
			inAppEnabled: true
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.notificationType).toBe('event_reminder');
			expect(result.data.pushEnabled).toBe(true);
			expect(result.data.emailEnabled).toBe(true);
			expect(result.data.inAppEnabled).toBe(true);
		}
	});

	it('accepts preference with all channels disabled', () => {
		const result = notificationPreferenceSchema.safeParse({
			notificationType: 'new_message',
			pushEnabled: false,
			emailEnabled: false,
			inAppEnabled: false
		});

		expect(result.success).toBe(true);
	});

	it('rejects preference with invalid notification type', () => {
		const result = notificationPreferenceSchema.safeParse({
			notificationType: 'invalid',
			pushEnabled: true,
			emailEnabled: true,
			inAppEnabled: true
		});

		expect(result.success).toBe(false);
	});

	it('rejects preference with missing required fields', () => {
		const result = notificationPreferenceSchema.safeParse({
			notificationType: 'event_reminder'
			// Missing channel fields
		});

		expect(result.success).toBe(false);
	});

	it('rejects preference with non-boolean channel values', () => {
		const result = notificationPreferenceSchema.safeParse({
			notificationType: 'event_reminder',
			pushEnabled: 'yes',
			emailEnabled: true,
			inAppEnabled: true
		});

		expect(result.success).toBe(false);
	});
});

describe('notificationSchema', () => {
	it('accepts valid notification', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'event_reminder',
			title: 'Event starting soon',
			message: 'Your event starts in 1 hour',
			link: '/events/123',
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe('Event starting soon');
			expect(result.data.isRead).toBe(false);
		}
	});

	it('accepts notification with read status', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'rsvp_confirmation',
			title: 'RSVP confirmed',
			message: 'You are going to Test Event',
			link: '/events/456',
			isRead: true,
			createdAt: '2026-01-26T15:00:00Z',
			readAt: '2026-01-26T16:00:00Z'
		});

		expect(result.success).toBe(true);
	});

	it('accepts notification without link', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'group_announcement',
			title: 'New announcement',
			message: 'Check out the latest news',
			link: null,
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(true);
	});

	it('rejects notification with invalid UUID', () => {
		const result = notificationSchema.safeParse({
			id: 'invalid-uuid',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'event_reminder',
			title: 'Test',
			message: 'Test message',
			link: null,
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(false);
	});

	it('rejects notification with title too long', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'event_reminder',
			title: 'a'.repeat(101),
			message: 'Test message',
			link: null,
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(false);
	});

	it('rejects notification with message too long', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'event_reminder',
			title: 'Test',
			message: 'a'.repeat(501),
			link: null,
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(false);
	});

	it('rejects notification with empty title', () => {
		const result = notificationSchema.safeParse({
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '123e4567-e89b-12d3-a456-426614174001',
			notificationType: 'event_reminder',
			title: '',
			message: 'Test message',
			link: null,
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});

		expect(result.success).toBe(false);
	});
});
