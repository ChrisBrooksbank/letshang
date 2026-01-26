import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getReminderTypeLabel,
	getDeliveryStatusLabel,
	calculateReminderTime,
	getSchedulableReminders,
	formatReminderInfo,
	buildReminderEmailData
} from './reminders';
import type { Tables } from '$lib/types/database';

describe('Reminder Utilities', () => {
	describe('getReminderTypeLabel', () => {
		it('should return correct label for seven_days', () => {
			expect(getReminderTypeLabel('seven_days')).toBe('7 days before');
		});

		it('should return correct label for two_days', () => {
			expect(getReminderTypeLabel('two_days')).toBe('2 days before');
		});

		it('should return correct label for day_of', () => {
			expect(getReminderTypeLabel('day_of')).toBe('Day of event');
		});
	});

	describe('getDeliveryStatusLabel', () => {
		it('should return correct label for scheduled', () => {
			expect(getDeliveryStatusLabel('scheduled')).toBe('Scheduled');
		});

		it('should return correct label for sent', () => {
			expect(getDeliveryStatusLabel('sent')).toBe('Sent');
		});

		it('should return correct label for failed', () => {
			expect(getDeliveryStatusLabel('failed')).toBe('Failed');
		});

		it('should return correct label for cancelled', () => {
			expect(getDeliveryStatusLabel('cancelled')).toBe('Cancelled');
		});
	});

	describe('calculateReminderTime', () => {
		beforeEach(() => {
			// Mock current time to 2026-01-20 12:00:00
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
		});

		describe('seven_days reminder', () => {
			it('should schedule 7 days before at 9 AM', () => {
				const eventStart = new Date('2026-02-01T18:00:00.000Z');
				const result = calculateReminderTime(eventStart, 'seven_days');

				expect(result).toBeTruthy();
				const reminderTime = new Date(result!);
				expect(reminderTime.getDate()).toBe(25); // 7 days before Feb 1
				expect(reminderTime.getMonth()).toBe(0); // January
				expect(reminderTime.getHours()).toBe(9);
			});

			it('should return null if 7 days before would be in the past', () => {
				const eventStart = new Date('2026-01-25T18:00:00.000Z'); // Only 5 days away
				const result = calculateReminderTime(eventStart, 'seven_days');

				expect(result).toBeNull();
			});

			it('should handle string input', () => {
				const eventStart = '2026-02-01T18:00:00.000Z';
				const result = calculateReminderTime(eventStart, 'seven_days');

				expect(result).toBeTruthy();
			});
		});

		describe('two_days reminder', () => {
			it('should schedule 2 days before at 9 AM', () => {
				const eventStart = new Date('2026-01-25T18:00:00.000Z');
				const result = calculateReminderTime(eventStart, 'two_days');

				expect(result).toBeTruthy();
				const reminderTime = new Date(result!);
				expect(reminderTime.getDate()).toBe(23); // 2 days before Jan 25
				expect(reminderTime.getHours()).toBe(9);
			});

			it('should return null if 2 days before would be in the past', () => {
				const eventStart = new Date('2026-01-21T18:00:00.000Z'); // Only 1 day away
				const result = calculateReminderTime(eventStart, 'two_days');

				expect(result).toBeNull();
			});
		});

		describe('day_of reminder', () => {
			it('should schedule at 9 AM if event is after 10 AM', () => {
				const eventStart = new Date('2026-01-21T18:00:00.000Z'); // 6 PM
				const result = calculateReminderTime(eventStart, 'day_of');

				expect(result).toBeTruthy();
				const reminderTime = new Date(result!);
				expect(reminderTime.getDate()).toBe(21);
				expect(reminderTime.getHours()).toBe(9);
			});

			it('should schedule 1 hour before if event is before 10 AM', () => {
				const eventStart = new Date('2026-01-21T08:00:00.000Z'); // 8 AM
				const result = calculateReminderTime(eventStart, 'day_of');

				expect(result).toBeTruthy();
				const reminderTime = new Date(result!);
				expect(reminderTime.getHours()).toBe(7); // 1 hour before
			});

			it('should return null if day_of reminder would be in the past', () => {
				const eventStart = new Date('2026-01-20T11:00:00.000Z'); // Event is in 1 hour
				const result = calculateReminderTime(eventStart, 'day_of');

				expect(result).toBeNull();
			});
		});
	});

	describe('getSchedulableReminders', () => {
		beforeEach(() => {
			// Mock current time to 2026-01-20 12:00:00
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
		});

		it('should return all three reminders for event far in future', () => {
			const eventStart = new Date('2026-02-15T18:00:00.000Z'); // 26 days away
			const result = getSchedulableReminders(eventStart);

			expect(result).toHaveLength(3);
			expect(result[0].type).toBe('seven_days');
			expect(result[1].type).toBe('two_days');
			expect(result[2].type).toBe('day_of');
		});

		it('should return only two_days and day_of for event 5 days away', () => {
			const eventStart = new Date('2026-01-25T18:00:00.000Z'); // 5 days away
			const result = getSchedulableReminders(eventStart);

			expect(result).toHaveLength(2);
			expect(result[0].type).toBe('two_days');
			expect(result[1].type).toBe('day_of');
		});

		it('should return only day_of for event tomorrow', () => {
			const eventStart = new Date('2026-01-21T18:00:00.000Z'); // Tomorrow
			const result = getSchedulableReminders(eventStart);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe('day_of');
		});

		it('should return empty array for event in the past', () => {
			const eventStart = new Date('2026-01-19T18:00:00.000Z'); // Yesterday
			const result = getSchedulableReminders(eventStart);

			expect(result).toHaveLength(0);
		});

		it('should include scheduledFor timestamps', () => {
			const eventStart = new Date('2026-02-15T18:00:00.000Z');
			const result = getSchedulableReminders(eventStart);

			result.forEach((reminder) => {
				expect(reminder.scheduledFor).toBeTruthy();
				expect(typeof reminder.scheduledFor).toBe('string');
				expect(new Date(reminder.scheduledFor).toISOString()).toBe(reminder.scheduledFor);
			});
		});
	});

	describe('formatReminderInfo', () => {
		it('should format reminder with scheduled status', () => {
			const reminder: Tables<'event_reminders'> = {
				id: '123',
				event_id: '456',
				user_id: '789',
				reminder_type: 'seven_days',
				scheduled_for: '2026-01-27T09:00:00.000Z',
				status: 'scheduled',
				sent_at: null,
				error_message: null,
				created_at: '2026-01-20T12:00:00.000Z',
				updated_at: '2026-01-20T12:00:00.000Z'
			};

			const result = formatReminderInfo(reminder);

			expect(result.typeLabel).toBe('7 days before');
			expect(result.statusLabel).toBe('Scheduled');
			expect(result.scheduledForDisplay).toContain('Jan');
			expect(result.scheduledForDisplay).toContain('27');
			expect(result.isFailed).toBe(false);
			expect(result.isCancelled).toBe(false);
			expect(result.isSent).toBe(false);
		});

		it('should format reminder with sent status', () => {
			const reminder: Tables<'event_reminders'> = {
				id: '123',
				event_id: '456',
				user_id: '789',
				reminder_type: 'two_days',
				scheduled_for: '2026-01-25T09:00:00.000Z',
				status: 'sent',
				sent_at: '2026-01-25T09:05:00.000Z',
				error_message: null,
				created_at: '2026-01-20T12:00:00.000Z',
				updated_at: '2026-01-25T09:05:00.000Z'
			};

			const result = formatReminderInfo(reminder);

			expect(result.statusLabel).toBe('Sent');
			expect(result.isSent).toBe(true);
			expect(result.isFailed).toBe(false);
			expect(result.isCancelled).toBe(false);
		});

		it('should format reminder with failed status', () => {
			const reminder: Tables<'event_reminders'> = {
				id: '123',
				event_id: '456',
				user_id: '789',
				reminder_type: 'day_of',
				scheduled_for: '2026-01-27T09:00:00.000Z',
				status: 'failed',
				sent_at: null,
				error_message: 'Email delivery failed',
				created_at: '2026-01-20T12:00:00.000Z',
				updated_at: '2026-01-27T09:05:00.000Z'
			};

			const result = formatReminderInfo(reminder);

			expect(result.statusLabel).toBe('Failed');
			expect(result.isFailed).toBe(true);
			expect(result.isSent).toBe(false);
			expect(result.isCancelled).toBe(false);
		});

		it('should format reminder with cancelled status', () => {
			const reminder: Tables<'event_reminders'> = {
				id: '123',
				event_id: '456',
				user_id: '789',
				reminder_type: 'seven_days',
				scheduled_for: '2026-01-27T09:00:00.000Z',
				status: 'cancelled',
				sent_at: null,
				error_message: null,
				created_at: '2026-01-20T12:00:00.000Z',
				updated_at: '2026-01-21T12:00:00.000Z'
			};

			const result = formatReminderInfo(reminder);

			expect(result.statusLabel).toBe('Cancelled');
			expect(result.isCancelled).toBe(true);
			expect(result.isSent).toBe(false);
			expect(result.isFailed).toBe(false);
		});
	});

	describe('buildReminderEmailData', () => {
		const mockEvent = {
			title: 'Coffee Meetup',
			description: 'Join us for coffee and conversation',
			start_time: '2026-02-01T14:00:00.000Z',
			end_time: '2026-02-01T16:00:00.000Z',
			event_type: 'in_person' as const,
			venue_name: 'Local Coffee Shop',
			venue_address: '123 Main St, Seattle, WA',
			video_link: null
		};

		const mockUser = {
			id: 'user-123',
			display_name: 'John Doe'
		};

		it('should build email data for in-person event', () => {
			const result = buildReminderEmailData(mockEvent, mockUser, 'seven_days');

			expect(result.recipientName).toBe('John Doe');
			expect(result.eventTitle).toBe('Coffee Meetup');
			expect(result.eventDescription).toBe('Join us for coffee and conversation');
			expect(result.eventStartTime).toContain('February');
			expect(result.eventStartTime).toContain('2026');
			expect(result.eventEndTime).toContain('PM');
			expect(result.reminderTypeLabel).toBe('7 days before');
			expect(result.eventType).toBe('in_person');
			expect(result.venueName).toBe('Local Coffee Shop');
			expect(result.venueAddress).toBe('123 Main St, Seattle, WA');
			expect(result.videoLink).toBeNull();
			expect(result.mapUrl).toContain('google.com/maps');
			expect(result.mapUrl).toContain(encodeURIComponent('123 Main St, Seattle, WA'));
		});

		it('should build email data for online event', () => {
			const onlineEvent = {
				...mockEvent,
				event_type: 'online' as const,
				venue_name: null,
				venue_address: null,
				video_link: 'https://zoom.us/j/123456'
			};

			const result = buildReminderEmailData(onlineEvent, mockUser, 'two_days');

			expect(result.eventType).toBe('online');
			expect(result.venueName).toBeNull();
			expect(result.venueAddress).toBeNull();
			expect(result.videoLink).toBe('https://zoom.us/j/123456');
			expect(result.mapUrl).toBeNull();
		});

		it('should build email data for hybrid event', () => {
			const hybridEvent = {
				...mockEvent,
				event_type: 'hybrid' as const,
				video_link: 'https://meet.google.com/abc-defg-hij'
			};

			const result = buildReminderEmailData(hybridEvent, mockUser, 'day_of');

			expect(result.eventType).toBe('hybrid');
			expect(result.venueName).toBe('Local Coffee Shop');
			expect(result.venueAddress).toBe('123 Main St, Seattle, WA');
			expect(result.videoLink).toBe('https://meet.google.com/abc-defg-hij');
			expect(result.mapUrl).toBeTruthy();
			expect(result.reminderTypeLabel).toBe('Day of event');
		});

		it('should handle user with no display name', () => {
			const userWithoutName = {
				id: 'user-123',
				display_name: null
			};

			const result = buildReminderEmailData(mockEvent, userWithoutName, 'seven_days');

			expect(result.recipientName).toBe('there');
		});

		it('should handle event with no description', () => {
			const eventWithoutDesc = {
				...mockEvent,
				description: null
			};

			const result = buildReminderEmailData(eventWithoutDesc, mockUser, 'seven_days');

			expect(result.eventDescription).toBe('');
		});

		it('should handle event with no end time', () => {
			const eventWithoutEnd = {
				...mockEvent,
				end_time: null
			};

			const result = buildReminderEmailData(eventWithoutEnd, mockUser, 'seven_days');

			expect(result.eventEndTime).toBeNull();
		});

		it('should include correct event URL structure', () => {
			const result = buildReminderEmailData(mockEvent, mockUser, 'seven_days');

			expect(result.eventUrl).toContain('/events/');
			expect(result.eventUrl).toContain(mockUser.id);
		});
	});
});
