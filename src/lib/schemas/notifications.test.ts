import { describe, it, expect } from 'vitest';
import { notificationTypeEnum, notificationPreferenceSchema } from './notifications';

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
